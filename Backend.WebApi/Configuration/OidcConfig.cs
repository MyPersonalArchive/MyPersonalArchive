using Microsoft.Extensions.Configuration;

namespace Backend.WebApi.Configuration;

public class OidcConfig
{
	public const string Scheme = "Oidc";

	public bool Enabled { get; set; }
	public string? BackchannelAuthority { get; set; }

	/// <summary>
	/// Scheme+host (e.g. "https://localhost:8443") that the browser should be redirected to for
	/// sign-in/sign-out. Falls back to <see cref="Authority"/> when not set. Needed when the app
	/// reaches the identity provider via a different hostname (e.g. a Docker service name) than
	/// the one the user's browser can resolve.
	/// </summary>
	public string? BrowserAuthority { get; set; }

	public string? ClientId { get; set; }
	public string? ClientSecret { get; set; }
	public string? CallbackPath { get; set; }
	public string? SignedOutCallbackPath { get; set; }
	public string DefaultRedirectPath { get; set; } = "/";


	public bool IsValidForLoginFlow()
	{
		return Enabled
			&& !string.IsNullOrWhiteSpace(BackchannelAuthority)
			&& !string.IsNullOrWhiteSpace(ClientId)
			&& !string.IsNullOrWhiteSpace(ClientSecret)
			&& !string.IsNullOrWhiteSpace(CallbackPath)
			&& !string.IsNullOrWhiteSpace(SignedOutCallbackPath);
	}
}
