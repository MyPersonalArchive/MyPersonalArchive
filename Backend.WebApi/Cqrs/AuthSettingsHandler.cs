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
		return new GetAuthSettings.Response
		{
			OidcAuthUrl = _oidcConfig.IsValidForLoginFlow() ? "/api/oidc/signin" : null
		};
	}
}
