using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using System.Text.Json;
using Backend.Core;
using Backend.Mpa.DbModel.Database;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Backend.WebApi.Configuration;

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

		var subject = ResolveOidcSubjectFromClaims(oidcPrincipal);
		if (string.IsNullOrWhiteSpace(subject))
		{
			return Unauthorized("Missing 'sub' claim from OIDC provider");
		}

		var issuer = ResolveOidcIssuerFromClaims(oidcPrincipal, oidcResult);
		if (string.IsNullOrWhiteSpace(issuer))
		{
			return Unauthorized("Missing 'iss' claim from OIDC provider");
		}


		var username = ResolveUsernameFromClaims(oidcPrincipal, subject);
		if (string.IsNullOrWhiteSpace(username))
		{
			return Unauthorized("Missing username/email claim from OIDC provider");
		}

		var (organization, roles) = ResolveOrganizationAndRolesFromClaims(oidcPrincipal);

		var fullname = ResolveFullnameFromClaims(oidcPrincipal) ?? username;

		var email = ResolveEmailFromClaims(oidcPrincipal);
		if (string.IsNullOrWhiteSpace(email))
		{
			return Unauthorized("Missing email claim from OIDC provider");
		}

		var appIdentity = new ClaimsIdentity(
		[
			new Claim(ClaimTypes.NameIdentifier, subject),
			new Claim(ClaimTypes.GivenName, fullname),
			new Claim("organization", organization ?? string.Empty),
			.. roles.Select(role => new Claim(ClaimTypes.Role, role)),
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


	#region Helper methods to resolve claims
	private static string? ResolveUsernameFromClaims(ClaimsPrincipal user, string subject)
	{
		return user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub") ?? $"kc-{subject}";
	}

	private static string? ResolveEmailFromClaims(ClaimsPrincipal user)
	{
		return user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email");
	}

	private static string? ResolveOidcSubjectFromClaims(ClaimsPrincipal user)
	{
		return user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
	}

	private static string? ResolveOidcIssuerFromClaims(ClaimsPrincipal user, AuthenticateResult oidcResult)
	{
		var claimValue = user.FindFirstValue("iss");
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

	private static string? ResolveFullnameFromClaims(ClaimsPrincipal user)
	{
		return user.FindFirstValue(ClaimTypes.Name) ?? user.FindFirstValue("name");
	}

	private static (string? organization, IEnumerable<string> roles) ResolveOrganizationAndRolesFromClaims(ClaimsPrincipal user)
	{
		var organizationClaimValue = user.FindFirstValue("organization");
		if (string.IsNullOrWhiteSpace(organizationClaimValue))
		{
			throw new Exception("Missing 'organization' claim.");
			// return (null, []);
		}

		// e.g. {"org-name":{"groups":["/User"]}}
		var organizations = JsonSerializer.Deserialize<Dictionary<string, OrganizationClaimEntry>>(organizationClaimValue, JsonSerializerOptions.Web);
		var organizationEntry = organizations?.FirstOrDefault(entry => entry.Value is not null);
		if (organizationEntry is not { Key: not null } || organizationEntry.Value.Value is null)
		{
			throw new Exception("Malformed 'organization' claim.");
			// return (null, []);
		}

		var roles = organizationEntry.Value.Value.Groups.Select(group => group.TrimStart('/'));
		return (organizationEntry.Value.Key, roles);
	}

	private class OrganizationClaimEntry
	{
		public List<string> Groups { get; set; } = [];
	}
	#endregion
}
