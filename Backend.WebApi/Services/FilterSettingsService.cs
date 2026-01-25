using Backend.Core;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class FilterSettingsService : SettingsServiceBase<FilterSettings>
{
	protected override string FileName => "FilterSettings.json";

	private readonly SignalRService _signalRService;

	public FilterSettingsService(IOptions<AppConfig> config, IAmbientDataResolver resolver, SignalRService signalRService)
		: base(config, resolver)
	{
		_signalRService = signalRService;
	}


	public async Task<FilterSettings> GetFilterSettingsAsync()
	{
		return await LoadSettingsAsync();
	}

	public async Task StoreFilterSettingsAsync(FilterSettings settings)
	{
		await SaveSettingsAsync(settings);
		await _signalRService.PublishToTenantChannel(new SignalRService.Message("StoredFiltersUpdated", null));
	}
}


public class FilterSettings : SettingsBase
{
	public List<Filter> Filters { get; set; } = [];
	
	public class Filter
	{
		public Guid Id { get; set; }
		public string Name { get; set; }
		public FilterDefinition Definition { get; set; }
	}

	public class FilterDefinition
	{
		public string? Title { get; set; }
		public string[] Tags { get; set; }
		public string[] MetadataTypes { get; set; }
	}
}
