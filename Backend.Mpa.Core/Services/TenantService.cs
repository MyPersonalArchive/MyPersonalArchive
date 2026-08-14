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
	protected readonly ISignalRService _signalRService;

	public TenantService(IAmbientDataResolver ambientDataResolver, SystemSettingsFileStoreFactory fileStoreFactory, ISignalRService signalRService)
		: base(fileStoreFactory.GetFileStore())
	{
		_ambientDataResolver = ambientDataResolver;
		_signalRService = signalRService;
	}


	public async Task<TenantSettings.Tenant> GetCurrentTenantSettingsAsync()
	{
		var tenants = await LoadSettingsAsync();
		var currentTenant = tenants.Tenants.Single(tenant => tenant.Id == _ambientDataResolver.GetCurrentTenantId());
		return currentTenant;
	}

	public async Task SetTierAsync(string tierId)
	{
		await ChangeSettingsAsync(settings =>
		{
			var currentTenant = settings.Tenants.Single(tenant => tenant.Id == _ambientDataResolver.GetCurrentTenantId());
			currentTenant.TierId = tierId;
			return settings;
		});

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("TierUpdated", null));
	}
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
