using Backend.WebApi.Services;
using Microsoft.EntityFrameworkCore;


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
	private readonly FilterSettingsService _filterSettingsService;

	public StoredFilterHandler(FilterSettingsService filterSettingsService)
	{
		_filterSettingsService = filterSettingsService;
	}

	public async Task Handle(SaveStoredFilters command)
	{
		var filterSettings = command.StoredFilters.Select(f => new FilterSettings.Filter
		{
			Id = f.Id,
			Name = f.Name,
			Definition = new FilterSettings.FilterDefinition
			{
				Title = f.FilterDefinition.Title,
				Tags = f.FilterDefinition.Tags,
				MetadataTypes = f.FilterDefinition.MetadataTypes
			}
		}).ToList();

		await _filterSettingsService.StoreFilterSettingsAsync(new FilterSettings
		{
			Filters = filterSettings
		});
	}

	public async Task<IEnumerable<StoredFilter>> Handle(GetStoredFilters query)
	{
		var filterSettings = await _filterSettingsService.GetFilterSettingsAsync();

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
