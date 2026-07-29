using Microsoft.Extensions.Configuration;

namespace Backend.WebApi.Configuration;

public class OidcConfig
{
	public const string Scheme = "Oidc";

	public bool Enabled { get; set; }
	public string? Authority { get; set; }
	public string? ClientId { get; set; }
	public string? ClientSecret { get; set; }
	public string? CallbackPath { get; set; }
	public string? SignedOutCallbackPath { get; set; }
	public string DefaultRedirectPath { get; set; } = "/";
	public string TenantClaimType { get; set; } = "allowedTenants";


	public bool IsValidForLoginFlow()
	{
		return Enabled
			&& !string.IsNullOrWhiteSpace(Authority)
			&& !string.IsNullOrWhiteSpace(ClientId)
			&& !string.IsNullOrWhiteSpace(ClientSecret)
			&& !string.IsNullOrWhiteSpace(CallbackPath)
			&& !string.IsNullOrWhiteSpace(SignedOutCallbackPath);
	}
}