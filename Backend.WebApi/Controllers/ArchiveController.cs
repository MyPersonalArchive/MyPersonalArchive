using System.Threading.Tasks;
using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class ArchiveController : ControllerBase
{
    private readonly MpaDbContext _dbContext;
    private readonly IFileStorageProvider _fileProvider;
    private readonly SignalRService _signalRService;
    private readonly AmbientDataResolver _resolver;

    public ArchiveController(MpaDbContext dbContext, IFileStorageProvider fileProvider, SignalRService signalRService, AmbientDataResolver resolver)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
        _signalRService = signalRService;
        _resolver = resolver;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListResponse>>> List(/*ListRequest request*/)
    {
        return await _dbContext.ArchiveItems
            .Select(item => new ListResponse
            {
                Id = item.Id,
                Title = item.Title,
                Tags = item.Tags.Select(tag => tag.Title).ToList(),
                CreatedAt = item.CreatedAt
            })
            .ToListAsync();
    }


    [HttpPost]
    public async Task<ActionResult<CreateResponse>> Create(CreateRequest request /*, [FromForm] List<IFormFile> files*/)
    {
        var newArchiveItem = new ArchiveItem
        {
            Title = request.Title,
            CreatedByUsername = _resolver.GetCurrentUsername(),
            CreatedAt = DateTimeOffset.Now,
            Tags = [.. Tags.Ensure(_dbContext, request.Tags)],
            //Blobs = [.. blobs]
        };

        _dbContext.ArchiveItems.Add(newArchiveItem);
        _dbContext.SaveChanges();

        var message = new Message("ArchiveItemCreated", newArchiveItem.Id);
        await _signalRService.PublishToTenantChannel(message);

        return new CreateResponse
        {
            Id = newArchiveItem.Id
        };
    }


    [HttpPut]
    public async Task<ActionResult> Update(UpdateRequest updateRequest)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(item => item.Blobs)
            .Include(item => item.Tags)
            .SingleOrDefaultAsync(item => item.Id == updateRequest.Id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        archiveItem.Title = updateRequest.Title;
        archiveItem.Tags = [.. Tags.Ensure(_dbContext, updateRequest.Tags)];

        await _dbContext.SaveChangesAsync();

        var message = new Message("ArchiveItemUpdated", archiveItem.Id);
        await _signalRService.PublishToTenantChannel(message);

        return Ok();
    }


    [HttpGet]
    public async Task<ActionResult<GetResponse>> Get(int id)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .Include(archiveItem => archiveItem.Tags)
            .SingleOrDefaultAsync(x => x.Id == id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        return new GetResponse
        {
            Id = archiveItem.Id,
            Title = archiveItem.Title,
            Tags = [.. archiveItem.Tags.Select(tag => tag.Title)],
            CreatedAt = archiveItem.CreatedAt,
            Blobs = [.. archiveItem.Blobs?.Select(blob => new GetResponse.Blob
            {
                BlobId = blob.Id,
                NumberOfPages = blob.PageCount
            }).ToList() ?? [],],
        };
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<GetResponse>>> Search([FromQuery]SearchRequest searchRequest)
    {
        var searchQuery = _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .Include(archiveItem => archiveItem.Tags)
            .AsQueryable();

        if(!string.IsNullOrEmpty(searchRequest.Title)) 
        {
            searchQuery = searchQuery.Where(archiveItem => archiveItem.Title.ToLower().Contains(searchRequest.Title.ToLower()));
        }

        if(searchRequest.Tags?.Length > 0)
        {
            searchQuery = searchQuery.Where(archiveItem => searchRequest.Tags.All(tag => archiveItem.Tags.Any(t => t.Title == tag)));
        }

        var archiveItem = await searchQuery.ToListAsync();

        return archiveItem.Select(archiveItem => new GetResponse
        {
            Id = archiveItem.Id,
            Title = archiveItem.Title,
            Tags = [.. archiveItem.Tags.Select(tag => tag.Title)],
            CreatedAt = archiveItem.CreatedAt,
            Blobs = [.. archiveItem.Blobs?.Select(blob => new GetResponse.Blob
            {
                BlobId = blob.Id,
                NumberOfPages = blob.PageCount
            }).ToList() ?? [],]
        }).ToList();
    }


    [HttpDelete]
    public async Task<ActionResult> Delete([FromQuery] int id)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .SingleOrDefaultAsync(x => x.Id == id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        if (archiveItem.Blobs != null)
        {
            foreach (var blob in archiveItem.Blobs)
            {
                _fileProvider.DeleteFile(blob.PathInStore);
                _dbContext.Blobs.Remove(blob);
            }
        }

        _dbContext.ArchiveItems.Remove(archiveItem);
        await _dbContext.SaveChangesAsync();

        var message = new Message("ArchiveItemDeleted", archiveItem.Id);
        await _signalRService.PublishToUserChannel(message);
        
        return Ok();
    }


    #region Request and response models
    public class ListRequest
    {
        //TODO: Is filtering or paging needed?
    }

    public class ListResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public required ICollection<string> Tags { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CreateRequest
    {
        public required string Title { get; set; }
        public required List<string> Tags { get; set; }
    }

    public class CreateResponse
    {
        public required int Id { get; set; }
    }

    public class UpdateRequest
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public required List<string> Tags { get; set; }
    }

    public class GetResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public required List<string> Tags { get; set; }
       public required List<Blob> Blobs { get; set; }

        public class Blob 
        {
            public int BlobId { get; set; }
            public int NumberOfPages { get; set; }
        }
    }

    public class SearchRequest 
    {
        public string? Title { get; set; }
        public string[]? Tags { get; set; }
    }
    #endregion
}

