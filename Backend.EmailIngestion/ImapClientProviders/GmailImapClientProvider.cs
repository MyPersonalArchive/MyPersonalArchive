using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Core.Authentication;
using MailKit.Net.Imap;
using MailKit.Security;
using Microsoft.Extensions.Configuration;

namespace Backend.EmailIngestion.ImapClientProviders;

public class GmailImapClientProvider : ImapClientProviderBase
{
	private readonly string _clientId;
	private readonly string _clientSecret;
	private readonly HttpClient _httpClient;

	public override string Name => "gmail";

	public override AuthMode AuthenticationMode => AuthMode.OAuth2;


	public GmailImapClientProvider(IConfiguration config, HttpClient httpClient)
	{
		_clientId = config["Google:ClientId"]!;
		_clientSecret = config["Google:ClientSecret"]!;
		_httpClient = httpClient;
	}


	public override async Task<IImapClient> ConnectAsync(IAuthContext auth, string email)
	{
		if (auth is not OAuthContext oauth || oauth.AccessToken == null)
		{
			throw new ArgumentException("Invalid auth context for OAuth provider.");
		}
		
		var imapClient = new ImapClient();
		//TODO: What if auth fails, and we need to refresh the token?
		// (The token should've been refreshed before calling this method based on timestamps, but
		// what if our clock is off compared to the issuers clock, or the token was revoked etc?)
		await imapClient.ConnectAsync("imap.gmail.com", 993, SecureSocketOptions.SslOnConnect);
		await imapClient.AuthenticateAsync(new SaslMechanismOAuth2(email, oauth.AccessToken));

		return imapClient;
	}


//TODO: move this to an auth provider class, since it's not really related to the imap client itself
	public override async Task<IAuthContext> RefreshAccessTokenIfNeeded(IAuthContext auth)
	{
		if (auth is not OAuthContext oauth || oauth.AccessToken == null || oauth.ExpiresAt > DateTime.UtcNow)
		{
			return auth; // No need to refresh
		}
		
		var request = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
		{
			Content = new FormUrlEncodedContent(new[]
			{
				new KeyValuePair<string, string>("client_id", _clientId),
				new KeyValuePair<string, string>("client_secret", _clientSecret),
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
