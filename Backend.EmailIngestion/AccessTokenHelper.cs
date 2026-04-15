using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Core.Authentication;
using Backend.Core.Infrastructure;
using Backend.EmailIngestion.Services;
using Microsoft.Extensions.DependencyInjection;
// using Backend.WebApi.Services;
// using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.WebUtilities;

namespace Backend.EmailIngestion;


[RegisterService(ServiceLifetime.Scoped)]
public class AccessTokenHelper
{
	private readonly HttpClient _httpClient;

	public AccessTokenHelper(HttpClient httpClient)
	{
		_httpClient = httpClient;
	}

	public async Task<IAuthContext> RefreshAccessTokenIfNeeded(IAuthContext auth, EmailProviderSettings.IAuthType authType)
	{
		if (auth is not OAuthContext oauth || oauth.AccessToken == null || oauth.ExpiresAt > DateTime.UtcNow.Add(TimeSpan.FromMinutes(2)))
		{
			return auth; // No need to refresh
		}

		return await ForceRefreshAccessToken(auth, authType);
	}


	/// <summary>
	/// Unconditionally refreshes the access token, regardless of expiry timestamp.
	/// Use when the server rejects the token despite our clock saying it's valid.
	/// </summary>
	public async Task<IAuthContext> ForceRefreshAccessToken(IAuthContext auth, EmailProviderSettings.IAuthType authType)
	{
		if (auth is not OAuthContext oauth)
		{
			throw new ArgumentException("Cannot force-refresh a non-OAuth auth context.");
		}

		if (string.IsNullOrEmpty(oauth.RefreshToken))
		{
			throw new InvalidOperationException("No refresh token available. User must re-authenticate.");
		}

		if (authType is not EmailProviderSettings.OAuthAuthType oauthAuthType)
		{
			throw new ArgumentException("Invalid auth type for OAuth token refresh.");
		}
		
		// Use query parameters instead of form body - works for both Google and Zoho
		var parameters = new Dictionary<string, string?>
		{
			["client_id"] = oauthAuthType.ClientId,
			["client_secret"] = oauthAuthType.ClientSecret,
			["refresh_token"] = oauth.RefreshToken,
			["grant_type"] = "refresh_token",
		};
		
		var url = QueryHelpers.AddQueryString(oauthAuthType.TokenEndpoint, parameters);
		using var response = await _httpClient.PostAsync(url, null);

		var content = await response.Content.ReadAsStringAsync();
		var json = JsonDocument.Parse(content).RootElement;

		// Some providers (e.g. Zoho) return HTTP 200 with an error in the body
		if (json.TryGetProperty("error", out var error))
		{
			var errorDesc = json.TryGetProperty("error_description", out var desc) ? desc.GetString() : null;
			throw new InvalidOperationException($"OAuth token refresh failed: {error.GetString()}" +
				(errorDesc != null ? $" - {errorDesc}" : ""));
		}

		response.EnsureSuccessStatusCode();

		var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

		if (tokenResponse?.AccessToken == null)
		{
			throw new InvalidOperationException("Failed to obtain new access token from refresh token.");
		}

		return new OAuthContext
		{
			AccessToken = tokenResponse.AccessToken,
			RefreshToken = oauth.RefreshToken,
			ExpiresAt = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn)
		};
	}


	private class TokenResponse
	{
		[JsonPropertyName("access_token")]
		public string? AccessToken { get; set; }

		[JsonPropertyName("expires_in")]
		public int ExpiresIn { get; set; }
	}
}
