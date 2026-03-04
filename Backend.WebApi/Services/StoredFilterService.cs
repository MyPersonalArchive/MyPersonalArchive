using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Services.Infrastructure;
using Backend.WebApi.SignalR;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class StoredFilterService : TenantSettingsServiceBase<StoredFilterSettings>
{
	protected override string FileName => "StoredFilterSettings.json";

	private readonly SignalRService _signalRService;

	public StoredFilterService(IOptions<AppConfig> config, IAmbientDataResolver resolver, SignalRService signalRService)
		: base(config, resolver)
	{
		_signalRService = signalRService;
	}


	public async Task<StoredFilterSettings> GetStoredFilterSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

	public async Task StoreStoredFilterSettingsAsync(StoredFilterSettings settings)
	{
		await SaveSettingsAsync(settings);
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("StoredFiltersUpdated", null));
	}
}


public class StoredFilterSettings : SettingsBase
{
	public List<Filter> Filters { get; set; } = [];
	
	public class Filter
	{
		public Guid Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition Definition { get; set; }
	}

	public class FilterDefinition
	{
		public string? Title { get; set; }
		public required string[] Tags { get; set; }
		public required string[] MetadataTypes { get; set; }
	}
}
