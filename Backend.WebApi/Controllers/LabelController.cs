using Backend.Core;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Backend.WebApi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class LabelController : ControllerBase
{
    private readonly MpaDbContext _dbContext;
    private readonly AmbientDataResolver _resolver;
    private readonly SignalRService _signalRService;

    public LabelController(MpaDbContext dbContext, AmbientDataResolver resolver, SignalRService signalRService)
    {
        _dbContext = dbContext;
        _resolver = resolver;
        _signalRService = signalRService;
    }

    [HttpPost]
    public async Task Create(CreateLabelRequest request)
    {
        var currentUser = _dbContext.Users.FirstOrDefault(x => x.Username == _resolver.GetCurrentUsername());

        if (currentUser == null)
        {
            throw new Exception("User not found");
        }

        var label = new Label
        {
            Title = request.Title,
            Owner = currentUser
        };

        await _dbContext.Labels.AddAsync(label);
        await _dbContext.SaveChangesAsync();

        var message = new Message("LabelCreated");
        await _signalRService.PublishToTenantChannel(message);
    }

    [HttpGet]
    public async Task<IEnumerable<LabelResponse>> List()
    {
        var labels = await _dbContext.Labels
                            .Include(x => x.Owner)
                            .Where(x => x.Owner.Username == _resolver.GetCurrentUsername()).ToListAsync();

        return labels.Select(label => new LabelResponse
        {
            Title = label.Title
        });
    }

    [HttpGet]
    public async Task<List<ArchiveItem>> Get(string title)
    {
        var label = await _dbContext.Labels
                            .Include(x => x.Owner)
                            .Where(x => x.Owner.Username == _resolver.GetCurrentUsername())
                            .SingleOrDefaultAsync(x => x.Title == title);

        if (label == null)
        {
            return [];
        }

        return await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Tags)
            .Where(archiveItem => archiveItem.Label == null || archiveItem.Label.Title == label.Title)
            .ToListAsync();
    }

    [HttpDelete]
    public async Task Delete(string title)
    {
        var label = await _dbContext.Labels
                            .Include(x => x.Owner)
                            .Where(x => x.Owner.Username == _resolver.GetCurrentUsername())
                            .SingleOrDefaultAsync(x => x.Title == title);

        if (label == null)
        {
            return;
        }

        _dbContext.Labels.Remove(label);
        await _dbContext.SaveChangesAsync();

        //also clear all archiveItems that has this label?


        var message = new Message("LabelDeleted");
        await _signalRService.PublishToTenantChannel(message);
    }

    #region Request and response models
    public class CreateLabelRequest
    {
        public required string Title { get; set; }
    }

    public class LabelResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
    }
    #endregion
}