using System.Security.Claims;
using Backend.Core.Cqrs.Infrastructure;
using Backend.WebApi.Configuration;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Cqrs;

[NoRequirement]
public class GetAuthSettings : IQuery<GetAuthSettings, GetAuthSettings.Response>
{
	// no properties needed for this query, as it retrieves authentication settings

	public class Response
	{
		required public string? OidcAuthUrl { get; set; }
		required public string? OidcRegisterUrl { get; set; }
		required public bool IsManaged { get; set; }
	}
}

public class AuthSettingsHandler : IQueryHandler<GetAuthSettings, GetAuthSettings.Response>
{
	private readonly OidcConfig _oidcConfig;

	public AuthSettingsHandler(IOptions<OidcConfig> oidcConfig)
	{
		_oidcConfig = oidcConfig.Value;
	}


	public GetAuthSettings.Response Handle(GetAuthSettings query)
	{
		var isOidcValidForLoginFlow = _oidcConfig.IsValidForLoginFlow();
		return new GetAuthSettings.Response
		{
			OidcAuthUrl = isOidcValidForLoginFlow ? "/api/oidc/signin" : null,
			OidcRegisterUrl = isOidcValidForLoginFlow ? "/api/oidc/register" : null,
			IsManaged = isOidcValidForLoginFlow
		};
	}
}
