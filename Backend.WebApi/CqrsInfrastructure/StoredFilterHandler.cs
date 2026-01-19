using System.Diagnostics;
using Backend.DbModel.Database;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;


namespace Backend.WebApi.CqrsInfrastructure;


public class FilterDefinition
{
	public string? Title { get; set; }
	public required string[] Tags { get; set; }
	public required string[] MetadataTypes { get; set; }
}

[RequireAllowedTenantId]
public class CreateStoredFilter : ICommand<CreateStoredFilter>
{
	public required string Name { get; set; }
	public required FilterDefinition FilterDefinition { get; set; }
}

[RequireAllowedTenantId]
public class ListStoredFilters : IQuery<ListStoredFilters, IEnumerable<ListStoredFilters.Result>>
{
	// No parameters to list stored filters

	public class Result
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}
}

[RequireAllowedTenantId]
public class GetStoredFilter : IQuery<GetStoredFilter, GetStoredFilter.Result>
{
	public int Id { get; set; }

	public class Result
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}
}

[RequireAllowedTenantId]
public class UpdateStoredFilter : ICommand<UpdateStoredFilter>
{
	public int Id { get; set; }
	public required string Name { get; set; }
	public required FilterDefinition FilterDefinition { get; set; }
}

[RequireAllowedTenantId]
public class DeleteStoredFilter : ICommand<DeleteStoredFilter>
{
	public int Id { get; set; }
}


public class StoredFilterHandler :
	IAsyncCommandHandler<CreateStoredFilter>,
	IAsyncQueryHandler<ListStoredFilters, IEnumerable<ListStoredFilters.Result>>,
	IAsyncQueryHandler<GetStoredFilter, GetStoredFilter.Result>,
	IAsyncCommandHandler<UpdateStoredFilter>,
	IAsyncCommandHandler<DeleteStoredFilter>
{
	private readonly MpaDbContext _dbContext;
	private readonly StoredFilterService _storedFilterService;

	public StoredFilterHandler(MpaDbContext dbContext, StoredFilterService storedFilterService)
	{
		_dbContext = dbContext;
		_storedFilterService = storedFilterService;
	}

	public async Task Handle(CreateStoredFilter command)
	{
		// Validate command parameters

		var filter = new StoredFilter
		{
			Name = command.Name,
			Title = command.FilterDefinition.Title,
			Tags = command.FilterDefinition.Tags,
			MetadataTypes = command.FilterDefinition.MetadataTypes
		};
		_dbContext.StoredFilters.Add(filter);
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersAddedMessage([filter.Id]);
	}

	public async Task<IEnumerable<ListStoredFilters.Result>> Handle(ListStoredFilters query)
	{
		//TODO: Should this be in the StoredFilterService?
		return await _dbContext.StoredFilters
			.Select(sf => new ListStoredFilters.Result
			{
				Id = sf.Id,
				Name = sf.Name,
				FilterDefinition = new FilterDefinition
				{
					Title = sf.Title,
					Tags = sf.Tags ?? Array.Empty<string>(),
					MetadataTypes = sf.MetadataTypes ?? Array.Empty<string>()
				}
			}
			).ToListAsync();
	}

	public async Task<GetStoredFilter.Result> Handle(GetStoredFilter query)
	{
		var storedFilter = await _dbContext.StoredFilters.FindAsync(query.Id);
		if (storedFilter == null)
		{
			throw new Exception($"Stored filter with ID {query.Id} not found.");
			//TODO: return a 404 instead?
		}

		return new GetStoredFilter.Result
		{
			Id = storedFilter.Id,
			Name = storedFilter.Name,
			FilterDefinition = new FilterDefinition
			{
				Title = storedFilter.Title,
				Tags = storedFilter.Tags ?? Array.Empty<string>(),
				MetadataTypes = storedFilter.MetadataTypes ?? Array.Empty<string>()
			}
		};
	}

	public async Task Handle(UpdateStoredFilter command)
	{
		// TODO: Validate command parameters

		var storedFilter = await _dbContext.StoredFilters.FindAsync(command.Id);
		if (storedFilter == null)
		{
			throw new Exception($"Stored filter with ID {command.Id} not found.");
			//TODO: return a 404 instead?
		}

		storedFilter.Name = command.Name;
		storedFilter.Title = command.FilterDefinition.Title;
		storedFilter.Tags = command.FilterDefinition.Tags;
		storedFilter.MetadataTypes = command.FilterDefinition.MetadataTypes;
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersUpdatedMessage([command.Id]);
	}

	public async Task Handle(DeleteStoredFilter command)
	{
		var storedFilter = await _dbContext.StoredFilters.FindAsync(command.Id);
		if (storedFilter == null)
		{
			throw new Exception($"Stored filter with ID {command.Id} not found.");
			//TODO: return a 404 instead?
		}
		_dbContext.StoredFilters.Remove(storedFilter);
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersDeletedMessage([command.Id]);
	}

}
