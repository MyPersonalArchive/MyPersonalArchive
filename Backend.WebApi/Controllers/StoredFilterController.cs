
using System.Threading.Tasks;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.WebApi;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Message = Backend.WebApi.Services.SignalRService.Message;

namespace Backend.WebApi.Controllers;

// SAMPLE: This is an example controller for comparison to StoredFilterHandler.

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class StoredFilterController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private readonly StoredFilterService _storedFilterService;

	public StoredFilterController(MpaDbContext dbContext, StoredFilterService storedFilterService)
	{
		_dbContext = dbContext;
		_storedFilterService = storedFilterService;
	}

	[HttpPost("")]
	public async Task<IActionResult> Create([FromBody] CreateRequest request)
	{
		// Validate command parameters

		var filter = new StoredFilter
		{
			Name = request.Name,
			Title = request.FilterDefinition.Title,
			Tags = request.FilterDefinition.Tags,
			MetadataTypes = request.FilterDefinition.MetadataTypes
		};
		_dbContext.StoredFilters.Add(filter);
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersAddedMessage([filter.Id]);

		return NoContent();
	}

	[HttpGet("")]
	public async Task<ActionResult<IEnumerable<ListResponse>>> List()
	{
		var response = await _dbContext.StoredFilters
			.Select(sf => new ListResponse
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

		return Ok(response);
	}

	[HttpGet("id={id}")]
	public async Task<ActionResult<GetResponse>> Get([FromRoute] int id)
	{
		var storedFilter = await _dbContext.StoredFilters.FindAsync(id);
		if (storedFilter == null)
		{
			return NotFound();
		}

		var response = new GetResponse
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
		return Ok(response);
	}

	[HttpPut("")]
	public async Task<IActionResult> Update([FromBody] UpdateRequest request)
	{
		// TODO: Validate command parameters

		var storedFilter = await _dbContext.StoredFilters.FindAsync(request.Id);
		if (storedFilter == null)
		{
			return NotFound();
		}

		storedFilter.Name = request.Name;
		storedFilter.Title = request.FilterDefinition.Title;
		storedFilter.Tags = request.FilterDefinition.Tags;
		storedFilter.MetadataTypes = request.FilterDefinition.MetadataTypes;
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersUpdatedMessage([request.Id]);

		return NoContent();
	}

	[HttpDelete("id={id}")]
	public async Task<IActionResult> Delete([FromRoute] int id)
	{
		var storedFilter = await _dbContext.StoredFilters.FindAsync(id);
		if (storedFilter == null)
		{
			return NotFound();
		}
		_dbContext.StoredFilters.Remove(storedFilter);
		await _dbContext.SaveChangesAsync();

		await _storedFilterService.PublishStoredFiltersDeletedMessage([id]);

		return NoContent();
	}

	#region Request and response models
	public class FilterDefinition
	{
		public string? Title { get; set; }
		public required string[] Tags { get; set; }
		public required string[] MetadataTypes { get; set; }
	}

	public class CreateRequest
	{
		public string Name { get; set; } = string.Empty;
		public required FilterDefinition FilterDefinition { get; set; }
	}

	public class ListResponse
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}

	public class GetResponse
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}

	public class UpdateRequest
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}
	#endregion
}