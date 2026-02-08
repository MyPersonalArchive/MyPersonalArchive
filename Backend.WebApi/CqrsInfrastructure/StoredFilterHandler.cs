using Backend.WebApi.Services;


namespace Backend.WebApi.CqrsInfrastructure;


public class StoredFilter
{
	public Guid Id { get; set; }
	public required string Name { get; set; }
	public required FilterDefinition FilterDefinition { get; set; }
}

public class FilterDefinition
{
	public string? Title { get; set; }
	public required string[] Tags { get; set; }
	public required string[] MetadataTypes { get; set; }
}


[RequireAllowedTenantId]
public class SaveStoredFilters : ICommand<SaveStoredFilters>
{
	public required IEnumerable<StoredFilter> StoredFilters { get; set; }
}

[RequireAllowedTenantId]
public class GetStoredFilters : IQuery<GetStoredFilters, IEnumerable<StoredFilter>>
{
	// No parameters to get all stored filters
}


public class StoredFilterHandler :
	IAsyncCommandHandler<SaveStoredFilters>,
	IAsyncQueryHandler<GetStoredFilters, IEnumerable<StoredFilter>>
{
	private readonly StoredFilterService _storedFilterService;

	public StoredFilterHandler(StoredFilterService storedFilterService)
	{
		_storedFilterService = storedFilterService;
	}

	public async Task Handle(SaveStoredFilters command)
	{
		var filters = command.StoredFilters.Select(f => new StoredFilterSettings.Filter
		{
			Id = f.Id,
			Name = f.Name,
			Definition = new StoredFilterSettings.FilterDefinition
			{
				Title = f.FilterDefinition.Title,
				Tags = f.FilterDefinition.Tags,
				MetadataTypes = f.FilterDefinition.MetadataTypes
			}
		}).ToList();

		await _storedFilterService.StoreStoredFilterSettingsAsync(new StoredFilterSettings
		{
			Filters = filters
		});
	}

	public async Task<IEnumerable<StoredFilter>> Handle(GetStoredFilters query)
	{
		var filterSettings = await _storedFilterService.GetStoredFilterSettingsAsync();

		return filterSettings!.Filters.Select(f => new StoredFilter
		{
			Id = f.Id,
			Name = f.Name,
			FilterDefinition = new FilterDefinition
			{
				Title = f.Definition.Title,
				Tags = f.Definition.Tags,
				MetadataTypes = f.Definition.MetadataTypes
			}
		});
	}

}
