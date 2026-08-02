namespace Backend.Mpa.Core;

public class KeycloakConfig
{
	public const string Scheme = "Keycloak";

	public bool Enabled { get; set; }
	public string? BaseUrl { get; set; }
	public string? Authority { get; set; }
	public string? Realm { get; set; }
	public string? ClientId { get; set; }
	public string? ClientSecret { get; set; }
	// public string? CallbackPath { get; set; }
	// public string? SignedOutCallbackPath { get; set; }
	// public string DefaultRedirectPath { get; set; } = "/";
}