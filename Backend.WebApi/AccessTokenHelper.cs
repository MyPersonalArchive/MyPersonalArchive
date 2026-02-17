using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Core.Authentication;
using Backend.Core.Infrastructure;
using Backend.WebApi.Services;

namespace Backend.EmailIngestion.ImapClientProviders;


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
		if (auth is not OAuthContext oauth || oauth.AccessToken == null || oauth.ExpiresAt > DateTime.UtcNow.Subtract(TimeSpan.FromMinutes(2)))
		{
			return auth; // No need to refresh
		}

		if(authType is not EmailProviderSettings.OAuthAuthType oauthAuthType)
		{
			throw new ArgumentException("Invalid auth type for OAuth token refresh.");
		}
		
		var request = new HttpRequestMessage(HttpMethod.Post, oauthAuthType.TokenEndpoint)
		{
			Content = new FormUrlEncodedContent(new[]
			{
				new KeyValuePair<string, string>("client_id", oauthAuthType.ClientId),
				new KeyValuePair<string, string>("client_secret", oauthAuthType.ClientSecret),
				new KeyValuePair<string, string>("refresh_token", oauth.RefreshToken!),
				new KeyValuePair<string, string>("grant_type", "refresh_token"),
			})
		};

		using var response = await _httpClient.SendAsync(request);
		response.EnsureSuccessStatusCode();

		var content = await response.Content.ReadAsStringAsync();
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
