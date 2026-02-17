using Backend.Core.Infrastructure;
using Microsoft.Extensions.Options;

namespace Backend.Core.Services.Infrastructure;

public abstract class UserSettingsServiceBase<T> : SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected UserSettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
		: base(config, resolver)
	{
	}

	protected override string GetSettingsPath()
	{
		var tenantId = Resolver.GetCurrentTenantId() ?? throw new Exception("Cannot get user settings file path without a tenant context");
		var userName = Resolver.GetCurrentUsername() ?? throw new Exception("Cannot get user settings file path without a user context");
		return Path.Combine(SettingsFolder, tenantId.ToString(), userName.ToString());
	}
}
