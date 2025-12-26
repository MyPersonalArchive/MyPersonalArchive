
using System.Threading.Tasks;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.WebApi;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Message = Backend.WebApi.Services.SignalRService.Message;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class StoredFilterController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private readonly SignalRService _signalRService;
	private readonly IAmbientDataResolver _resolver;

	public StoredFilterController(MpaDbContext dbContext, SignalRService signalRService, IAmbientDataResolver resolver)
	{
		_dbContext = dbContext;
		_signalRService = signalRService;
		_resolver = resolver;
	}

	[HttpGet]
	public async Task<ActionResult<IEnumerable<ListResponse>>> List()
	{
		var filters  = _dbContext.StoredFilters
			.Select(f => new ListResponse
			{
				Id = f.Id,
				Name = f.Name,
				FilterDefinition = new FilterDefinition
				{
					Title = f.Title,
					Tags = f.Tags,
					MetadataTypes = f.MetadataTypes
				}
			})
			.ToList();
		return Ok(filters);
	}

	// public IEnumerable<StoredFilter> List()
	// {
	// 	return _dbContext.StoredFilters;
	// }

	[HttpPost]
	public async Task<StoredFilter> Create([FromBody] StoredFilter storedFilter)
	{
		_dbContext.StoredFilters.Add(storedFilter);
		_dbContext.SaveChanges();

		await _signalRService.PublishToTenantChannel(new Message("StoredFilterCreated", storedFilter));

		return storedFilter;
	}


	[HttpPut]
	public async Task<IActionResult> Update([FromBody] StoredFilter storedFilter)
	{
		var filter = _dbContext.StoredFilters.SingleOrDefault(s => s.Id == storedFilter.Id);
		if (filter == null) return NotFound();

		filter.Name = storedFilter.Name;
		filter.Title = storedFilter.Title;
		filter.Tags = storedFilter.Tags;
		filter.MetadataTypes = storedFilter.MetadataTypes;

		_dbContext.SaveChanges();

		await _signalRService.PublishToTenantChannel(new Message("StoredFilterUpdated", storedFilter));

		return NoContent();
	}

	[HttpDelete]
	public async Task<IActionResult> Delete([FromQuery] int id)
	{
		var storedFilter = _dbContext.StoredFilters.Single(x => x.Id == id);
		_dbContext.StoredFilters.Remove(storedFilter);

		await _signalRService.PublishToTenantChannel(new Message("StoredFilterDeleted", new { id }));

		_dbContext.SaveChanges();

		return NoContent();
	}


	#region Request and response models
	public class ListResponse
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition{ get; set; }
	}
	
	public class CreateRequest
	{
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}


	public class UpdateRequest
	{
		public int Id { get; set; }
		public required string Name { get; set; }
		public required FilterDefinition FilterDefinition { get; set; }
	}

	public class FilterDefinition
	{
		public string? Title { get; set; }
		public required string[] Tags { get; set; }
		public required string[] MetadataTypes { get; set; }
	}
	#endregion
}