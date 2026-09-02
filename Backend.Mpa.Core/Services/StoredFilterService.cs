using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.Core.Services.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class StoredFilterService : SettingsServiceBase<StoredFilterSettings>
{
	protected override string FileName => "StoredFilterSettings.json";

	private readonly ISignalRService _signalRService;

	public StoredFilterService(ISignalRService signalRService, TenantSettingsFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
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

	override protected async Task<StoredFilterSettings> InitializeAsync()
	{
		var settings = await base.InitializeAsync();

		settings.Filters = new List<StoredFilterSettings.Filter>{
			new StoredFilterSettings.Filter{
				Id = Guid.NewGuid(),
				Name = "All items",
				Definition = new StoredFilterSettings.FilterDefinition{
					Title = "",
					Tags = [],
					MetadataTypes = []
				}
			},
			new StoredFilterSettings.Filter{
				Id = Guid.NewGuid(),
				Name = "Receipts",
				Definition = new StoredFilterSettings.FilterDefinition{
					Title = "",
					Tags = [],
					MetadataTypes = ["receipt"]
				}
			},
			new StoredFilterSettings.Filter{
				Id = Guid.NewGuid(),
				Name = "Travel docs",
				Definition = new StoredFilterSettings.FilterDefinition{
					Title = "",
					Tags = [],
					MetadataTypes = ["travel-document"]
				}
			},
			new StoredFilterSettings.Filter{
				Id = Guid.NewGuid(),
				Name = "Emails",
				Definition = new StoredFilterSettings.FilterDefinition{
					Title = "",
					Tags = [],
					MetadataTypes = ["email"]
				}
			}
		};

		return settings;
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
