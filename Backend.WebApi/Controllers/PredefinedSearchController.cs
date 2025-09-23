
using System.Threading.Tasks;
using Backend.Core;
using Backend.DbModel.Database;
using Backend.WebApi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class PredefinedSearchController : ControllerBase
{
    private readonly MpaDbContext _dbContext;
    private readonly SignalRService _signalRService;
    private readonly AmbientDataResolver _resolver;

    public PredefinedSearchController(MpaDbContext dbContext, SignalRService signalRService, AmbientDataResolver resolver)
    {
        _dbContext = dbContext;
        _signalRService = signalRService;
        _resolver = resolver;
    }

    [HttpGet]
    public IEnumerable<PredefinedSearch> List()
    {
        return _dbContext.PredefinedSearches;
    }

    [HttpPost]
    public async Task<PredefinedSearch> Create([FromBody] PredefinedSearch predefinedSearch)
    {
        _dbContext.PredefinedSearches.Add(predefinedSearch);
        _dbContext.SaveChanges();

        await _signalRService.PublishToTenantChannel(new Message("PredefinedSearchCreated", predefinedSearch));

        return predefinedSearch;
    }

    [HttpPut]
    public async Task Update([FromBody] PredefinedSearch predefinedSearch)
    {
        var search = _dbContext.PredefinedSearches.Single(s => s.Id == predefinedSearch.Id);
        if(search == null) throw new Exception("Predefined search not found");

        search.Name = predefinedSearch.Name;
        search.Title = predefinedSearch.Title;
        search.Tags = predefinedSearch.Tags;
        search.MetadataTypes = predefinedSearch.MetadataTypes;

        _dbContext.SaveChanges();

        await _signalRService.PublishToTenantChannel(new Message("PredefinedSearchUpdated", predefinedSearch));
    }

    [HttpDelete]
    public async Task Delete([FromQuery] int id)
    {
        var predefinedSearch = _dbContext.PredefinedSearches.Single(x => x.Id == id);
        _dbContext.PredefinedSearches.Remove(predefinedSearch);

        await _signalRService.PublishToTenantChannel(new Message("PredefinedSearchDeleted", id));

        _dbContext.SaveChanges();
    }
}