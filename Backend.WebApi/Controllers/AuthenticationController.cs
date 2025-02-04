using Backend.DbModel.Database;
using ConsoleApp1;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[Controller]")]
public class AuthenticationController : ControllerBase
{
    private readonly MpaDbContext _dbContext;
    private readonly PasswordHasher _passwordHasher;

    private const string RefreshTokenKey = "refresh-token";
    private readonly CookieOptions _refreshCookieOptions = new CookieOptions
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict, // Prevent CSRF attacks
        Expires = DateTime.UtcNow.AddDays(7), // Cookie expiration
    };


    public AuthenticationController(MpaDbContext dbContext, PasswordHasher passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }


    [AllowAnonymous]
    [HttpPost("SignIn")]
    public async Task<ActionResult<SignInResponse>> SignIn(SignInRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            throw new UnauthorizedAccessException();
            // return BadRequest("Unable to login");
        }

        var user = await _dbContext.Users.SingleOrDefaultAsync(user => user.Username == request.Username);
        if (user == null)
        {
            return Unauthorized("Unable to login");
        }

        if (!_passwordHasher.VerifyPassword(request.Password, user.HashedPassword, user.Salt))
        {
            return Unauthorized("Unable to login");
        }

        var (accessToken, refreshToken) = _passwordHasher.GenerateTokens();
        await _dbContext.Tokens.AddAsync(new Token
        {
            Username = user.Username,
            RefreshToken = refreshToken,
            Expires = DateTime.Now.AddDays(7),
        });
        _dbContext.SaveChanges();

        Response.Cookies.Append(RefreshTokenKey, refreshToken, _refreshCookieOptions);
        var response = new SignInResponse
        {
            Username = user.Username,
            Fullname = user.Fullname,
            AccessToken = accessToken
        };
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("Refresh")]
    public async Task<ActionResult<RefreshResponse>> Refresh()
    {
        var incomingRefreshToken = Request.Cookies[RefreshTokenKey];

        var token = await _dbContext.Tokens
            .Include(token => token.User)
            .SingleOrDefaultAsync(token => token.RefreshToken == incomingRefreshToken && token.Expires >= DateTimeOffset.Now);
        if (token == null)
        {
            return Forbid("Unable to refresh tokens");
        }

        var user = token.User ?? throw new NullReferenceException("A Token must always have a user");

        // delete the user's expired refreah tokens
        var expiredTokens = user.Tokens!.Where(token => token.Expires < DateTime.Now);
        _dbContext.Tokens.RemoveRange(expiredTokens);

        var (accessToken, newRefreshToken) = _passwordHasher.GenerateTokens();
        await _dbContext.Tokens.AddAsync(new Token
        {
            Username = user.Username,
            RefreshToken = newRefreshToken,
            Expires = DateTime.Now.AddDays(7)
        });
        _dbContext.SaveChanges();

        Response.Cookies.Append(RefreshTokenKey, newRefreshToken, _refreshCookieOptions);
        var response = new RefreshResponse
        {
            Username = user.Username,
            Fullname = user.Fullname,
            AccessToken = accessToken
        };
        return Ok(response);
    }

    [Authorize]
    [HttpPost("SignOut")]
    public async Task<IActionResult> SignOut(SignOutRequest request)
    {
        var incomingRefreshToken = Request.Cookies[RefreshTokenKey];

        // overwrite the refreshToken cookie
        Response.Cookies.Append(RefreshTokenKey, string.Empty, _refreshCookieOptions);

        var username = User.Identity!.Name;
        var tokenToRemove = await _dbContext.Tokens.SingleOrDefaultAsync(token => token.RefreshToken == incomingRefreshToken && token.Username == username);
        if (tokenToRemove == null)
        {
            return NotFound("Unable to signout user");
        }
        _dbContext.Tokens.Remove(tokenToRemove);
        _dbContext.SaveChanges();

        return Ok();
    }


    public class SignInRequest
    {
        public string? Username { get; set; }
        public string? Password { get; set; }
    }


    public class SignInResponse
    {
        public required string Username { get; set; }
        public required string Fullname { get; set; }
        public required string AccessToken { get; set; }
    }


    public class RefreshResponse
    {
        public required string Username { get; set; }
        public required string Fullname { get; set; }
        public required string AccessToken { get; set; }
    }

    public class SignOutRequest
    {
    }
}

