using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Backend.Core;
using Backend.Mpa.DbModel.Database;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Backend.WebApi.Configuration;
using Backend.Mpa.DbModel.Database.EntityModels;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/oidc")]
public class OidcAuthenticationController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private readonly PasswordHasher _passwordHasher;
	private readonly OidcConfig _oidcConfig;


	public OidcAuthenticationController(MpaDbContext dbContext, PasswordHasher passwordHasher, IOptions<OidcConfig> oidcConfig)
	{
		_dbContext = dbContext;
		_passwordHasher = passwordHasher;
		_oidcConfig = oidcConfig.Value;
	}


	[AllowAnonymous]
	[HttpGet("signin")]
	public IActionResult StartOidcSignIn([FromQuery] string? returnUrl = null)
	{
		if (!_oidcConfig.IsValidForLoginFlow())
		{
			return BadRequest("OIDC login is not enabled/configured");
		}

		var target = string.IsNullOrWhiteSpace(returnUrl) ? _oidcConfig.DefaultRedirectPath : returnUrl;
		if (!Url.IsLocalUrl(target))
		{
			return BadRequest("returnUrl must be a local URL");
		}

		var properties = new AuthenticationProperties
		{
			
			RedirectUri = Url.Action(nameof(FinishOidcSignIn), new { returnUrl = target })
		};

		return Challenge(properties, "Oidc");
	}


	[AllowAnonymous]
	[HttpGet("callback")]
	public async Task<IActionResult> FinishOidcSignIn([FromQuery] string? returnUrl = null)
	{
		if (!_oidcConfig.IsValidForLoginFlow())
		{
			return BadRequest("OIDC login is not enabled/configured");
		}

		var oidcResult = await HttpContext.AuthenticateAsync(CookieAuthenticationDefaults.AuthenticationScheme);
		if (!oidcResult.Succeeded || oidcResult.Principal is null)
		{
			return Unauthorized("OIDC authentication failed");
		}
		var oidcPrincipal = oidcResult.Principal;

		var subject = ResolveOidcSubjectFromClaims(oidcPrincipal.Claims);
		if (string.IsNullOrWhiteSpace(subject))
		{
			return Unauthorized("Missing 'sub' claim from OIDC provider");
		}

		var issuer = ResolveOidcIssuerFromClaims(oidcPrincipal.Claims, oidcResult);
		if (string.IsNullOrWhiteSpace(issuer))
		{
			return Unauthorized("Missing 'iss' claim from OIDC provider");
		}


		var username = ResolveUsernameFromClaims(oidcPrincipal.Claims, subject);
		if (string.IsNullOrWhiteSpace(username))
		{
			return Unauthorized("Missing username/email claim from OIDC provider");
		}

		var organization = oidcPrincipal.Claims.FirstOrDefault(claim => claim.Type == "organization")?.Value;

		var fullname = ResolveFullnameFromClaims(oidcPrincipal.Claims, username);

		var email = ResolveEmailFromClaims(oidcPrincipal.Claims);
		if (string.IsNullOrWhiteSpace(email))
		{
			return Unauthorized("Missing email claim from OIDC provider");
		}

		var appIdentity = new ClaimsIdentity(
		[
			new Claim(ClaimTypes.NameIdentifier, subject),
			new Claim(ClaimTypes.GivenName, fullname),
			new Claim("organization", organization ?? string.Empty),
			new Claim(ClaimTypes.Email, email),
		], CookieAuthenticationDefaults.AuthenticationScheme);

		await HttpContext.SignInAsync(
			CookieAuthenticationDefaults.AuthenticationScheme,
			new ClaimsPrincipal(appIdentity),
			new AuthenticationProperties
			{
				IsPersistent = true,
				ExpiresUtc = DateTimeOffset.UtcNow.AddDays(7)
			});

		var target = string.IsNullOrWhiteSpace(returnUrl) ? _oidcConfig.DefaultRedirectPath : returnUrl;
		if (!Url.IsLocalUrl(target))
		{
			target = _oidcConfig.DefaultRedirectPath;
		}

		return LocalRedirect(target);
	}


	[Authorize]
	[HttpPost("signout")]
	public IActionResult SignOutFromOidc([FromQuery] string? returnUrl = null)
	{
		if (!_oidcConfig.IsValidForLoginFlow())
		{
			return BadRequest("OIDC login is not enabled/configured");
		}

		var target = string.IsNullOrWhiteSpace(returnUrl) ? _oidcConfig.DefaultRedirectPath : returnUrl;
		if (!Url.IsLocalUrl(target))
		{
			target = _oidcConfig.DefaultRedirectPath;
		}

		var properties = new AuthenticationProperties
		{
			RedirectUri = target
		};

		return SignOut(properties, CookieAuthenticationDefaults.AuthenticationScheme, "Oidc");
	}


	[Authorize]
	[HttpGet("current-user-info")]
	public async Task<ActionResult<CurrentUserInfoResponse>> CurrentUserInfo()
	{
		var username = User.Claims.FirstOrDefault(claim => claim.Type == ClaimTypes.NameIdentifier)?.Value;
		var fullname = User.Claims.FirstOrDefault(claim => claim.Type == ClaimTypes.GivenName)?.Value;
		var organization = User.Claims.FirstOrDefault(claim => claim.Type == "organization")?.Value;

		var response = new CurrentUserInfoResponse
		{
			Username = username!,
			Fullname = fullname!,
			CurrentTenantId = organization
		};
		return Ok(response);
	}


	#region Helper methods to resolve claims
	private static string? ResolveUsernameFromClaims(IEnumerable<Claim> claims, string subject)
	{
		return claims.FirstOrDefault(claim => claim.Type == ClaimTypes.NameIdentifier)?.Value
			?? claims.FirstOrDefault(claim => claim.Type == "sub")?.Value
			?? $"kc-{subject}";
	}

	private static string? ResolveEmailFromClaims(IEnumerable<Claim> claims)
	{
		return claims.FirstOrDefault(claim => claim.Type == ClaimTypes.Email)?.Value
			?? claims.FirstOrDefault(claim => claim.Type == "email")?.Value;
	}

	private static string? ResolveOidcSubjectFromClaims(IEnumerable<Claim> claims)
	{
		return claims.FirstOrDefault(claim => claim.Type == "sub")?.Value
			?? claims.FirstOrDefault(claim => claim.Type == ClaimTypes.NameIdentifier)?.Value;
	}

	private static string? ResolveOidcIssuerFromClaims(IEnumerable<Claim> claims, AuthenticateResult oidcResult)
	{
		var claimValue = claims.FirstOrDefault(claim => claim.Type == "iss")?.Value;
		if (!string.IsNullOrWhiteSpace(claimValue))
		{
			return claimValue;
		}

		var idToken = oidcResult.Properties?.GetTokenValue("id_token");
		if (string.IsNullOrWhiteSpace(idToken))
		{
			return null;
		}

		try
		{
			return new JwtSecurityTokenHandler().ReadJwtToken(idToken).Issuer;
		}
		catch
		{
			return null;
		}
	}

	private static string ResolveFullnameFromClaims(IEnumerable<Claim> claims, string fallback)
	{
		return claims.FirstOrDefault(claim => claim.Type == ClaimTypes.Name)?.Value
			?? claims.FirstOrDefault(claim => claim.Type == "name")?.Value
			?? fallback;
	}
	#endregion


	#region Request and response models
	public class CurrentUserInfoResponse
	{
		public required string Username { get; set; }
		public required string Fullname { get; set; }
		public string? CurrentTenantId { get; internal set; }
	}
	#endregion
}
