using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class TenantService : SettingsServiceBase<TenantSettings>
{
	protected override string FileName => "TenantSettings.json";

protected readonly IAmbientDataResolver _ambientDataResolver;

	public TenantService(IAmbientDataResolver ambientDataResolver, SystemSettingsFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
		_ambientDataResolver = ambientDataResolver;
	}


	public async Task<TenantSettings.Tenant> GetCurrentTenantSettingsAsync()
	{
		var tenants = await LoadSettingsAsync();
		var currentTenant = tenants.Tenants.Single(tenant => tenant.Id == _ambientDataResolver.GetCurrentTenantId());
		return currentTenant;
	}

	// public async Task StoreTenantSettingsAsync(TenantSettings settings)
	// {
	// 	await SaveSettingsAsync(settings);
	// 	await _signalRService.PublishToTenantChannel(new ISignalRService.Message("TenantSettingsUpdated", null));
	// }
}


public class TenantSettings : SettingsBase
{
	public IEnumerable<Tenant> Tenants { get; set; } = [];

	public class Tenant
	{
		public required string Id { get; set; }
		public required string Title { get; set; }
		public required string TierId { get; set; }
	}
}
