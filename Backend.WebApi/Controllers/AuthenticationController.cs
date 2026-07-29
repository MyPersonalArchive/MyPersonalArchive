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
[Route("api/[Controller]")]
public class AuthenticationController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private readonly PasswordHasher _passwordHasher;
	private readonly OidcConfig _oidcConfig;


	public AuthenticationController(MpaDbContext dbContext, PasswordHasher passwordHasher, IOptions<OidcConfig> oidcConfig)
	{
		_dbContext = dbContext;
		_passwordHasher = passwordHasher;
		_oidcConfig = oidcConfig.Value;
	}


	[AllowAnonymous]
	[HttpGet("oidc/signin")]
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
	[HttpGet("oidc/callback")]
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

		var fullname = ResolveFullnameFromClaims(oidcPrincipal.Claims, username);
		var user = await _dbContext.Users
			.SingleOrDefaultAsync(u => u.Issuer == issuer && u.Subject == subject);

		if (user is null)
		{
			user = new User
			{
				Username = username,
				Fullname = fullname,
				HashedPassword = null,
				Salt = null,
				Issuer = issuer,
				Subject = subject
			};

			_dbContext.Users.Add(user);
			await _dbContext.SaveChangesAsync();
		}

		await SyncUserTenantsFromAllowedTenantsClaimAsync(user.Id, oidcPrincipal.Claims);
		// Re-fetch the user with tenants to ensure we have the latest tenant associations
		user = await _dbContext.Users
			.Include(u => u.Tenants)
			.SingleAsync(u => u.Id == user.Id);

		var appIdentity = new ClaimsIdentity(
		[
			new Claim(ClaimTypes.Name, user.Username),
			new Claim(ClaimTypes.NameIdentifier, user.Username),
			new Claim("AllowedTenants", string.Join(",", user.Tenants.Select(tenant => tenant.Id)))
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
	[HttpPost("oidc/signout")]
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

	private async Task SyncUserTenantsFromAllowedTenantsClaimAsync(int userId, IEnumerable<Claim> claims)
	{
		var requestedTenantIds = ParseAllowedTenantIdsFromClaims(claims);

		// Keep only tenant IDs that actually exist in DB
		var validTenantIds = await _dbContext.Tenants
			.Where(t => requestedTenantIds.Contains(t.Id))
			.Select(t => t.Id)
			.ToListAsync();

		var existingTenantIds = await _dbContext.Set<UserTenant>()
			.Where(ut => ut.UserId == userId)
			.Select(ut => ut.TenantId)
			.ToListAsync();

		var toAdd = validTenantIds.Except(existingTenantIds).ToList();
		var toRemove = existingTenantIds.Except(validTenantIds).ToList();

		if (toRemove.Count > 0)
		{
			var entriesToRemove = await _dbContext.Set<UserTenant>()
				.Where(ut => ut.UserId == userId && toRemove.Contains(ut.TenantId))
				.ToListAsync();
			_dbContext.Set<UserTenant>().RemoveRange(entriesToRemove);
		}

		if (toAdd.Count > 0)
		{
			var entriesToAdd = toAdd
				.Select(tenantId => new UserTenant { UserId = userId, TenantId = tenantId });
			await _dbContext.Set<UserTenant>().AddRangeAsync(entriesToAdd);
		}

		if (toAdd.Count > 0 || toRemove.Count > 0)
		{
			await _dbContext.SaveChangesAsync();
		}
	}


	#region Helper methods to resolve claims
	private static string? ResolveUsernameFromClaims(IEnumerable<Claim> claims, string subject)
	{
		return claims.FirstOrDefault(claim => claim.Type == ClaimTypes.Email)?.Value
			?? claims.FirstOrDefault(claim => claim.Type == "email")?.Value
			?? claims.FirstOrDefault(claim => claim.Type == ClaimTypes.NameIdentifier)?.Value
			?? claims.FirstOrDefault(claim => claim.Type == "sub")?.Value
			?? $"kc-{subject}";
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

	private static HashSet<int> ParseAllowedTenantIdsFromClaims(IEnumerable<Claim> claims)
	{
		return claims
			.Where(c => string.Equals(c.Type, "allowedTenants", StringComparison.OrdinalIgnoreCase))
			.Select(c => int.TryParse(c.Value, out var tenantId) ? (int?)tenantId : null)
			.Where(tenantId => tenantId is not null)
			.Select(tenantId => tenantId!.Value)
			.ToHashSet();
	}
	#endregion


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
