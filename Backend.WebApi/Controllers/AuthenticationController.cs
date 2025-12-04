using System.ComponentModel;
using System.Diagnostics;
using System.Security.Claims;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
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

		var user = await _dbContext.Users
			.Include(user => user.Tenants)
			.SingleOrDefaultAsync(user => user.Username == request.Username);
		if (user == null)
		{
			return Unauthorized("Unable to login");
		}

		if (!_passwordHasher.VerifyPassword(request.Password, user.HashedPassword, user.Salt))
		{
			return Unauthorized("Unable to login");
		}

		var response = new SignInResponse
		{
			Username = user.Username,
			Fullname = user.Fullname,
			AvailableTenantIds = user.Tenants.Select(tenant => tenant.Id)
		};

		var authProperties = new AuthenticationProperties();
		if (request.RememberMe)
		{
			authProperties.IsPersistent = true;
			authProperties.ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7); //TODO: consider using 30 days
		}

		var identity = new ClaimsIdentity(
			[
				new Claim(ClaimTypes.Name, user.Username),			//TODO: should this be set to user.Fullname?
				new Claim(ClaimTypes.NameIdentifier, user.Username),
				new Claim("AllowedTenants", string.Join(",", user.Tenants.Select(tenant => tenant.Id)))
			], "Cookies");
		await HttpContext.SignInAsync(
				CookieAuthenticationDefaults.AuthenticationScheme,
				new ClaimsPrincipal(identity),
				authProperties
			);
		return Ok(response);
	}


	[Authorize]
	[HttpGet("current-user-info")]
	public async Task<ActionResult<CurrentUserInfoResponse>> CurrentUserInfo()
	{
		var username = User.Identity?.Name;
		if (username == null)
		{
			return Unauthorized();
		}

		var user = await _dbContext.Users
			.Include(user => user.Tenants)
			.SingleOrDefaultAsync(user => user.Username == username);
		if (user == null)
		{
			return Unauthorized();
		}

		var response = new CurrentUserInfoResponse
		{
			Username = user.Username,
			Fullname = user.Fullname,
			AvailableTenantIds = user.Tenants.Select(tenant => tenant.Id)
		};
		return Ok(response);
	}


	[AllowAnonymous]
	[HttpPost("access-denied-redirect")]
	public async Task<IActionResult> AccessDeniedRedirect()
	{
		return Ok(new { message = "Du har ikke noe her å gjøre!" });
	}


	[Authorize]
	[HttpPost("SignOut")]
	public async Task<IActionResult> SignOutAction([FromQuery] bool signOutUserFromAllDevices = false)
	{
		await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
		return NoContent();
	}


	#region Request and response models

	public class SignInRequest
	{
		public string? Username { get; set; }
		public string? Password { get; set; }
		public bool RememberMe { get; set; } = false;
	}


	public class SignInResponse
	{
		public required string Username { get; set; }
		public required string Fullname { get; set; }
		public required IEnumerable<int> AvailableTenantIds { get; set; }
	}


	public class CurrentUserInfoResponse
	{
		public required string Username { get; set; }
		public required string Fullname { get; set; }
		public required IEnumerable<int> AvailableTenantIds { get; set; }
	}

	#endregion
}
