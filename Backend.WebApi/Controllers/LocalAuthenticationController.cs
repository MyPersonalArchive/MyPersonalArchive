using System.Security.Claims;
using Backend.Core;
using Backend.WebApi.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/Authentication")]
public class LocalAuthenticationController : ControllerBase
{
	private readonly LocalAuthenticationService _localAuthenticationService;
	private readonly PasswordHasher _passwordHasher;


	public LocalAuthenticationController(PasswordHasher passwordHasher, LocalAuthenticationService localAuthenticationService)
	{
		_passwordHasher = passwordHasher;
		_localAuthenticationService = localAuthenticationService;
	}


	[AllowAnonymous]
	[HttpPost("SignIn")]
	public async Task<ActionResult<SignInResponse>> SignIn(SignInRequest request)
	{
		if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
		{
			return BadRequest("Unable to login");
		}

		var user = await _localAuthenticationService.GetUserAsync(request.Username);
		if (user == null)
		{
			return Unauthorized("Unable to login");
		}

		if (user.HashedPassword == null || user.Salt == null)
		{
			// If the user has no password set, we cannot verify the password.
			// This happens when the user is created without a password, for example when using external authentication providers.
			return Unauthorized("Unable to login");
		}

		if (!_passwordHasher.VerifyPassword(request.Password, user.HashedPassword, user.Salt))
		{
			return Unauthorized("Unable to login");
		}

		var authProperties = new AuthenticationProperties();
		if (request.RememberMe)
		{
			authProperties.IsPersistent = true;
			authProperties.ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7); //TODO: consider using 30 days
		}

		var roles = user.Roles;
		var organization = "default-tenant";

		var identity = new ClaimsIdentity(
			[
				new Claim(ClaimTypes.NameIdentifier, user.Username),
				new Claim(ClaimTypes.GivenName, user.Fullname),
				new Claim("organization", organization),
				..roles.Select(role => new Claim(ClaimTypes.Role, role)),
				new Claim(ClaimTypes.Email, "dummy.email@example.com"), // Placeholder for email claim; adjust as needed
			], "Cookies");
		await HttpContext.SignInAsync(
				CookieAuthenticationDefaults.AuthenticationScheme,
				new ClaimsPrincipal(identity),
				authProperties
			);

		var response = new SignInResponse
		{
			Username = user.Username,
			Fullname = user.Fullname,
			TenantId = organization,
			Roles = roles
		};
		return Ok(response);
	}


	[AllowAnonymous]
	[HttpPost("access-denied-redirect")]
	public IActionResult AccessDeniedRedirect()
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
		public required string TenantId { get; set; }
		public required IEnumerable<string> Roles { get; set; }
	}


	public class CurrentUserInfoResponse
	{
		public required string Username { get; set; }
		public required string Fullname { get; set; }
	}

	#endregion
}
