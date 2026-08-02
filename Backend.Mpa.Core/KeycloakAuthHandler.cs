using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Backend.Core.Infrastructure;
using Microsoft.Extensions.DependencyInjection;


namespace Backend.Mpa.Core;

[RegisterService(ServiceLifetime.Scoped, RegistrationMode.RegisterAsSelf)]
public class KeycloakAuthHandler : DelegatingHandler
{
	private readonly KeycloakConfig _keycloakOptions;
	private readonly IHttpClientFactory _httpClientFactory;
	private string? _cachedToken;
	private DateTimeOffset _cachedTokenExpiresAt = DateTimeOffset.MinValue;

	public KeycloakAuthHandler(KeycloakConfig keycloakOptions, IHttpClientFactory httpClientFactory)
	{
		_keycloakOptions = keycloakOptions;
		_httpClientFactory = httpClientFactory;
	}

	protected override async Task<HttpResponseMessage> SendAsync(
		HttpRequestMessage request,
		CancellationToken cancellationToken)
	{
		var token = await GetAccessTokenAsync(cancellationToken);
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

		return await base.SendAsync(request, cancellationToken);
	}

	private async Task<string> GetAccessTokenAsync(CancellationToken ct)
	{
		// Reuse the cached token until shortly before it expires
		if (_cachedToken is not null && DateTimeOffset.UtcNow < _cachedTokenExpiresAt)
		{
			return _cachedToken;
		}

		var tokenEndpoint = $"{_keycloakOptions.BaseUrl}/realms/{_keycloakOptions.Realm}/protocol/openid-connect/token";

		using var tokenClient = _httpClientFactory.CreateClient();
		using var tokenReq = new HttpRequestMessage(HttpMethod.Post, tokenEndpoint)
		{
			Content = new FormUrlEncodedContent(new Dictionary<string, string>
			{
				["client_id"] = _keycloakOptions.ClientId!,
				["client_secret"] = _keycloakOptions.ClientSecret!,
				["grant_type"] = "client_credentials"
			})
		};

		using var tokenRes = await tokenClient.SendAsync(tokenReq, ct);
		if (!tokenRes.IsSuccessStatusCode)
		{
			var errorBody = await tokenRes.Content.ReadAsStringAsync(ct);
			throw new InvalidOperationException(
				$"Failed to obtain Keycloak service token from '{tokenEndpoint}': {(int)tokenRes.StatusCode} {tokenRes.ReasonPhrase}. {errorBody}");
		}

		var token = await tokenRes.Content.ReadFromJsonAsync<TokenResponse>(cancellationToken: ct);
		if (string.IsNullOrEmpty(token?.AccessToken))
		{
			throw new InvalidOperationException($"Keycloak token response from '{tokenEndpoint}' did not contain an access token.");
		}

		_cachedToken = token.AccessToken;
		_cachedTokenExpiresAt = DateTimeOffset.UtcNow.AddSeconds(Math.Max(token.ExpiresIn - 30, 0));

		return _cachedToken;
	}


	public record TokenResponse
	{
		[JsonPropertyName("access_token")]
		public string AccessToken { get; init; } = "";

		[JsonPropertyName("expires_in")]
		public int ExpiresIn { get; init; }
	}
}

