using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class StoredFilterService : SettingsServiceBase<StoredFilterSettings>
{
	protected override string FileName => "StoredFilterSettings.json";

	private readonly ISignalRService _signalRService;

	public StoredFilterService(IAmbientDataResolver resolver, ISignalRService signalRService, TenantSettingsFileStoreFactory fileStoreFactory)
		: base(resolver, fileStoreFactory.GetFileStore())
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
		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("StoredFiltersUpdated", null));
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
