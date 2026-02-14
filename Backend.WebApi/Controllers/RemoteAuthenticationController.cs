using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using Backend.EmailIngestion;
using System.IdentityModel.Tokens.Jwt;
using Backend.WebApi.Services;
using Backend.Core;
using Microsoft.AspNetCore.WebUtilities;


namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[Controller]")]
[Authorize(Policy = "TenantIdPolicy")]
public class RemoteAuthenticationController : ControllerBase
{
	private readonly string _baseurl;
	private readonly string _clientId;
	private readonly string _clientSecret;

	private readonly CookieOptions _secureCookieOptions = new()
	{
		HttpOnly = true,
		Secure = true,
		SameSite = SameSiteMode.Lax,
		IsEssential = true
	};

	private readonly IAmbientDataResolver _ambientDataResolver;

	public RemoteAuthenticationController(IConfiguration config, IAmbientDataResolver ambientDataResolver)
	{
		_baseurl = "https://accounts.google.com/o/oauth2/v2/auth";		//TODO: This should not be a provider-specific token endpoint
		_clientId = config["Google:ClientId"]!;
		_clientSecret = config["Google:ClientSecret"]!;

		_ambientDataResolver = ambientDataResolver;
	}


	[HttpGet("start-authentication")]
	public IActionResult StartAuthentication(
		[FromQuery(Name = "provider-name")] string providerName,
		[FromQuery(Name = "return-url")] string returnUrl)
	{
		// Validate inputs
		var tenantId = _ambientDataResolver.GetCurrentTenantId();
		if (tenantId == null)
		{
			return BadRequest("Missing tenant ID. Tenant ID is required to start authentication.");
		}


		if (providerName == "gmail")
		{
			var nonce = GenerateNonce();
			HttpContext.Response.Cookies.Append($"{providerName}-nonce", nonce, _secureCookieOptions);

			var state = new AuthState
			{
				Provider = providerName,
				Nonce = nonce,
				ReturnUrl = returnUrl,
				TenantId = tenantId.Value
			};

			var parameters = new Dictionary<string, string?>
			{
				["response_type"] = "code",
				["client_id"] = _clientId,
				["redirect_uri"] = Url.Action("CallbackFromProvider", "RemoteAuthentication", new { }, Request.Scheme),
				["scope"] = "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email",
				// ["scope"] = "https://mail.google.com/ https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
				["access_type"] = "offline",
				["prompt"] = "consent",
				["state"] = JsonSerializer.Serialize(state, JsonSerializerOptions.Web),
				// ["tenant-id"] = _ambientDataResolver.GetCurrentTenantId()?.ToString()
			};

			string redirectUrl = QueryHelpers.AddQueryString(_baseurl, parameters);
			return Redirect(redirectUrl);
		}
		else
		{
			return BadRequest($"Unknown provider: {providerName}");
		}
	}


	[HttpGet("callback")]
	public async Task<IActionResult> CallbackFromProvider(
		[FromQuery(Name = "state")] string encodedState,
		[FromQuery] string code,
		[FromServices] ExternalAccountService externalAccountSettingsService
		)
	{
		var state = JsonSerializer.Deserialize<AuthState>(Uri.UnescapeDataString(encodedState), JsonSerializerOptions.Web);
		if (state == null)
		{
			return BadRequest("Invalid state");
		}

		if (!HttpContext.Request.Cookies.TryGetValue($"{state.Provider}-nonce", out var nonce))
		{
			return BadRequest("Missing nonce cookie");
		}

		if (nonce != state.Nonce)
		{
			return BadRequest("Invalid nonce");
		}

		if (string.IsNullOrEmpty(code))
		{
			return BadRequest("Missing code");
		}

		var json = await ExchangeAuthorizationCodeForTokens(code);
		var authContext = new OAuthContext
		{
			AccessToken = json.GetProperty("access_token").GetString()!,
			RefreshToken = json.GetProperty("refresh_token").GetString(),
			ExpiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32())
		};

		var jwtToken = GetJwtToken(json.GetProperty("id_token"));
		// var fullName = jwtToken.Claims.FirstOrDefault(c => c.Type == "name")?.Value ?? "<missing name claim>";
		var emailAddress = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value ?? "<missing email claim>";

		var account = new ExternalAccountSettings.Account()
		{
			Id = Guid.NewGuid(),
			DisplayName = emailAddress,
			EmailAddress = emailAddress,
			Credentials = JsonSerializer.SerializeToElement(authContext, JsonSerializerOptions.Web),
			Type = "Email",
			Provider = state.Provider
		};
		await externalAccountSettingsService.AddOrReplace(account);

		return Redirect($"{state.ReturnUrl}/{account.Id}");
	}


	private static JwtSecurityToken GetJwtToken(JsonElement json)
	{
		var tokenHandler = new JwtSecurityTokenHandler();
		return tokenHandler.ReadJwtToken(json.GetString());
	}


	private async Task<JsonElement> ExchangeAuthorizationCodeForTokens(string code)
	{
		using var client = new HttpClient();

		var resp = await client.PostAsync(
			"https://oauth2.googleapis.com/token",      //TODO: This should not be a provider-specific token endpoint
			new FormUrlEncodedContent(new Dictionary<string, string>
			{
				["code"] = code,
				["client_id"] = _clientId,
				["client_secret"] = _clientSecret,
				["redirect_uri"] = Url.Action("CallbackFromProvider", "RemoteAuthentication", new { }, Request.Scheme)!,
				["grant_type"] = "authorization_code"
			})
		);
		resp.EnsureSuccessStatusCode();
		return JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;
	}


	private string GenerateNonce()
	{
		byte[] randomBytes = new byte[32];
		using (var rng = RandomNumberGenerator.Create())
		{
			rng.GetBytes(randomBytes);
		}
		return Convert.ToBase64String(randomBytes);
	}


	class AuthState
	{
		public required string Provider { get; set; }
		public required string Nonce { get; set; }
		public required string ReturnUrl { get; set; }
		public required int TenantId { get; set; }
	}
}