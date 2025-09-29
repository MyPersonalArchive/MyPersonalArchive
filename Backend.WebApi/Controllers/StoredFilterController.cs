
using System.Threading.Tasks;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.WebApi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class StoredFilterController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private readonly SignalRService _signalRService;
	private readonly AmbientDataResolver _resolver;

	public StoredFilterController(MpaDbContext dbContext, SignalRService signalRService, AmbientDataResolver resolver)
	{
		_dbContext = dbContext;
		_signalRService = signalRService;
		_resolver = resolver;
	}

	[HttpGet]
	public IEnumerable<StoredFilter> List()
	{
		return _dbContext.StoredFilters;
	}

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
}