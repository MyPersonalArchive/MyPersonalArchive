using Backend.Core.Infrastructure;
using Microsoft.Extensions.Options;

namespace Backend.Core.Services.Infrastructure;

public abstract class TenantSettingsServiceBase<T> : SettingsServiceBase<T> where T : SettingsBase, new()
{
	protected TenantSettingsServiceBase(IOptions<AppConfig> config, IAmbientDataResolver resolver)
		: base(config, resolver)
	{
	}

	protected override string GetSettingsPath()
	{
		var tenantId = Resolver.GetCurrentTenantId() ?? throw new Exception("Cannot get tenantsettings file path without a tenant context");
		return Path.Combine(SettingsFolder, tenantId.ToString());
	}
}
