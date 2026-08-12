using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class TierService : SettingsServiceBase<TierSettings>
{
	protected override string FileName => "TierSettings.json";

	public TierService(SystemSettingsFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
	}


	public async Task<TierSettings> GetTierSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

	// public async Task StoreTierSettingsAsync(TierSettings settings)
	// {
	// 	await SaveSettingsAsync(settings);
	// 	await _signalRService.PublishToTenantChannel(new ISignalRService.Message("TierSettingsUpdated", null));
	// }
}


public class TierSettings : SettingsBase
{
	public IEnumerable<Tier> Tiers { get; set; } = [];

	public class Tier
	{
		public required string Id { get; set; }
		public required DisplayFields Display { get; set; }
		public required long MaxStorageBytes { get; set; }
		public required decimal PricePerMonthEUR { get; set; }
		public required bool IsActive { get; set; }
	}

	public class DisplayFields
	{
		public required string Medal { get; set; }
		public required string Title { get; set; }
		public required string Description { get; set; }
		public required string Subtitle { get; set; }
		public required IEnumerable<string> Features { get; set; }
	}

}
