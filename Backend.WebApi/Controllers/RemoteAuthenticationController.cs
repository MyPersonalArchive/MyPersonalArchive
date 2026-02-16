using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.IdentityModel.Tokens.Jwt;
using Backend.WebApi.Services;
using Backend.Core;
using Microsoft.AspNetCore.WebUtilities;
using Backend.Core.Authentication;
using System.Net.Http.Headers;


namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[Controller]")]
[Authorize(Policy = "TenantIdPolicy")]
public class RemoteAuthenticationController : ControllerBase
{
	private readonly CookieOptions _secureCookieOptions = new()
	{
		HttpOnly = true,
		Secure = true,
		SameSite = SameSiteMode.Lax,
		IsEssential = true
	};


	[HttpGet("start-authentication")]
	public async Task<IActionResult> StartAuthentication(
		[FromQuery(Name = "provider-name")] string providerName,
		[FromQuery(Name = "auth-type")] string authType,
		[FromQuery(Name = "return-url")] string returnUrl,
		[FromServices] IAmbientDataResolver ambientDataResolver,
		[FromServices] EmailProviderService emailProviderService
	)
	{
		var tenantId = ambientDataResolver.GetCurrentTenantId();
		if (tenantId == null)
		{
			return BadRequest("Missing tenant ID. Tenant ID is required to start authentication.");
		}

		var emailProviderSettings = await emailProviderService.GetEmailProviderSettingsAsync();

		var providerSettings = emailProviderSettings.EmailProviders
			.FirstOrDefault(p => p.Name == providerName) ?? throw new Exception("Unknown email provider");

		var authTypeSettings = providerSettings.AuthTypes
			.FirstOrDefault(a => a.GetType().Name.StartsWith(authType, StringComparison.OrdinalIgnoreCase)) ?? throw new Exception("Unknown auth type");

		switch (authTypeSettings)
		{
			case EmailProviderSettings.OAuthAuthType oauthSettings:
				return StartAuthenticationWithOAuth(providerName, oauthSettings, returnUrl, tenantId.Value);

			case EmailProviderSettings.BasicAuthType:
				return BadRequest("Basic auth does not support remote authentication flow");

			default:
				throw new Exception("Unsupported auth type");
		}
	}

	private IActionResult StartAuthenticationWithOAuth(string providerName, EmailProviderSettings.OAuthAuthType oauthSettings, string returnUrl, int tenantId)
	{
		var nonce = GenerateNonce();
		HttpContext.Response.Cookies.Append($"{providerName}+{oauthSettings.Type}-nonce", nonce, _secureCookieOptions);

		var state = new AuthState
		{
			Provider = providerName,
			AuthenticationType = oauthSettings.Type,
			Nonce = nonce,
			ReturnUrl = returnUrl,
			TenantId = tenantId
		};

		var parameters = new Dictionary<string, string?>
		{
			["response_type"] = "code",
			["client_id"] = oauthSettings.ClientId,
			["redirect_uri"] = Url.Action("CallbackFromProvider", "RemoteAuthentication", new { }, Request.Scheme),
			["scope"] = oauthSettings.Scopes != null ? string.Join(" ", oauthSettings.Scopes) : null,
			["access_type"] = "offline",
			["prompt"] = "consent",
			["state"] = JsonSerializer.Serialize(state, JsonSerializerOptions.Web)
		};

		string redirectUrl = QueryHelpers.AddQueryString(oauthSettings.AuthEndpoint, parameters);
		return Redirect(redirectUrl);

	}


	[HttpGet("callback")]
	public async Task<IActionResult> CallbackFromProvider(
		[FromQuery(Name = "state")] string encodedState,
		[FromQuery] string code,
		[FromServices] ExternalAccountService externalAccountSettingsService,
		[FromServices] EmailProviderService emailProviderService
		)
	{
		var state = JsonSerializer.Deserialize<AuthState>(Uri.UnescapeDataString(encodedState), JsonSerializerOptions.Web);
		if (state == null)
		{
			return BadRequest("Invalid state");
		}

		if (!HttpContext.Request.Cookies.TryGetValue($"{state.Provider}+{state.AuthenticationType}-nonce", out var nonce))
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

		var emailProviderSettings = await emailProviderService.GetEmailProviderSettingsAsync();

		var providerSettings = emailProviderSettings.EmailProviders
			.FirstOrDefault(p => p.Name == state.Provider) ?? throw new Exception("Unknown email provider");

		var authTypeSettings = providerSettings.AuthTypes
			.FirstOrDefault(a => a.GetType().Name.StartsWith(state.AuthenticationType, StringComparison.OrdinalIgnoreCase)) ?? throw new Exception("Unknown auth type");

		if (authTypeSettings is not EmailProviderSettings.OAuthAuthType oauthSettings)
		{
			return BadRequest("Invalid auth type in state");
		}

		var json = await ExchangeAuthorizationCodeForTokens(code, oauthSettings);
		var authContext = new OAuthContext
		{
			AccessToken = json.GetProperty("access_token").GetString()!,
			RefreshToken = json.TryGetProperty("refresh_token", out var rt) ? rt.GetString() : null,
			ExpiresAt = DateTime.UtcNow.AddSeconds(json.GetProperty("expires_in").GetInt32())
		};

		var emailAddress = await ResolveEmailAddress(json, oauthSettings, authContext.AccessToken!);

		var account = new ExternalAccountSettings.Account()
		{
			Id = Guid.NewGuid(),
			DisplayName = emailAddress,
			EmailAddress = emailAddress,
			Credentials = authContext,
			Type = "Email",
			Provider = state.Provider
		};
		await externalAccountSettingsService.AddOrReplace(account);

		return Redirect($"{state.ReturnUrl}/{account.Id}");
	}


	private async Task<string> ResolveEmailAddress(JsonElement tokenResponse, EmailProviderSettings.OAuthAuthType oauthSettings, string accessToken)
	{
		// If provider returns an id_token (e.g. Google with OpenID Connect), extract email from JWT
		if (tokenResponse.TryGetProperty("id_token", out var idToken))
		{
			var tokenHandler = new JwtSecurityTokenHandler();
			var jwtToken = tokenHandler.ReadJwtToken(idToken.GetString());
			var email = jwtToken.Claims.FirstOrDefault(c => c.Type == "email")?.Value;
			if (email != null) return email;
		}

		// Otherwise, call the userinfo endpoint (e.g. Zoho)
		if (!string.IsNullOrEmpty(oauthSettings.UserInfoEndpoint))
		{
			using var client = new HttpClient();	//TODO: reuse HttpClient from DI
			client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Zoho-oauthtoken", accessToken);
			var resp = await client.GetAsync(oauthSettings.UserInfoEndpoint);
			resp.EnsureSuccessStatusCode();
			var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;

			// Try common claim names for email
			if (json.TryGetProperty("email", out var emailProp))
				return emailProp.GetString()!;
			if (json.TryGetProperty("Email", out var emailProp2))
				return emailProp2.GetString()!;
		}

		throw new Exception("Could not resolve email address from OAuth provider. " +
			"Ensure the provider returns an id_token or configure a UserInfoEndpoint.");
	}


	private async Task<JsonElement> ExchangeAuthorizationCodeForTokens(string code, EmailProviderSettings.OAuthAuthType oauthSettings)
	{
		using var client = new HttpClient();	//TODO: reuse HttpClient from DI

		var redirectUri = Url.Action("CallbackFromProvider", "RemoteAuthentication", new { }, Request.Scheme)!;
		
		var parameters = new Dictionary<string, string?>
		{
			["code"] = code,
			["client_id"] = oauthSettings.ClientId,
			["client_secret"] = oauthSettings.ClientSecret,
			["redirect_uri"] = redirectUri,
			["grant_type"] = "authorization_code",
		};

		// Some providers (e.g. Zoho) require params as query string, not form body.
		// Sending as query params works for both Google and Zoho.
		var url = QueryHelpers.AddQueryString(oauthSettings.TokenEndpoint, parameters);

		var resp = await client.PostAsync(url, null);
		resp.EnsureSuccessStatusCode();

		var json = JsonDocument.Parse(await resp.Content.ReadAsStringAsync()).RootElement;

		// Some providers (e.g. Zoho) return HTTP 200 with an error in the body
		if (json.TryGetProperty("error", out var error))
		{
			var errorDesc = json.TryGetProperty("error_description", out var desc) ? desc.GetString() : null;
			throw new Exception($"OAuth token exchange failed: {error.GetString()}" +
				(errorDesc != null ? $" - {errorDesc}" : "") +
				$" (endpoint: {oauthSettings.TokenEndpoint})");
		}

		return json;
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
		public required string AuthenticationType { get; set; }
		public required string Nonce { get; set; }
		public required string ReturnUrl { get; set; }
		public required int TenantId { get; set; }
	}
}