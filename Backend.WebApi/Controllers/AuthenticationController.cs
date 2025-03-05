using System.ComponentModel;
using System.Security.Claims;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
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
    private readonly CookieOptions _refreshCookieOptions = new()
    {
        HttpOnly = true,
        Secure = false, //TODO: Set to true in production
        SameSite = SameSiteMode.Strict, // Prevent CSRF attacks
        Expires = DateTime.UtcNow.AddDays(7), // Cookie expiration
        Path = "/api/Authentication/Refresh" // Only allow the refresh endpoint to access the cookie
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
            return BadRequest("Unable to login");
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

        List<Claim> claims = [new(ClaimTypes.Name, user.Fullname), new(ClaimTypes.NameIdentifier, user.Username)];
        var (accessToken, refreshToken) = _passwordHasher.GenerateTokens(claims);
        await _dbContext.Tokens.AddAsync(new Token
        {
            Username = user.Username,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.Now.Add(PasswordHasher.ExpiryDurationForRefreshTokens),
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

        var tokens = await _dbContext.Tokens
            .Include(token => token.User)
            .Where(token => token.RefreshToken == incomingRefreshToken)
            .ToListAsync();

        var token = tokens.SingleOrDefault(token => token.ExpiresAt >= DateTimeOffset.Now);
        if (token == null)
        {
            return Forbid();
        }

        var user = token.User ?? throw new NullReferenceException("A Token must always have a user");

        // delete the user's expired refresh tokens
        var expiredTokens = user.Tokens!.Where(token => token.ExpiresAt < DateTime.Now);
        _dbContext.Tokens.RemoveRange(expiredTokens);

        List<Claim> claims = [new(ClaimTypes.Name, user.Fullname), new(ClaimTypes.NameIdentifier, user.Username)];
        var (accessToken, newRefreshToken) = _passwordHasher.GenerateTokens(claims);
        await _dbContext.Tokens.AddAsync(new Token
        {
            Username = user.Username,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.Now.AddDays(7)
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
    public new async Task<IActionResult> SignOut()  //TODO: Change name or signature to not have to use 'new' here?
    {
        var incomingRefreshToken = Request.Cookies[RefreshTokenKey];

        // overwrite the refreshToken cookie
        Response.Cookies.Append(RefreshTokenKey, " ", _refreshCookieOptions);

        var tokenToRemove = await _dbContext.Tokens.SingleOrDefaultAsync(token => token.RefreshToken == incomingRefreshToken);
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
        [DefaultValue("admin@localhost")]
        public string? Username { get; set; }

        [DefaultValue("p@$$w0rd")]
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
}

