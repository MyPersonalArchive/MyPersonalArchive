using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Newtonsoft.Json;

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


    [HttpPost]
    public async Task<ActionResult<CreateResponse>> Create([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
    {
        var request = JsonConvert.DeserializeObject<CreateRequest>(rawRequest);
        if(request == null) 
        {
            return BadRequest();
        }

        var newArchiveItem = new ArchiveItem
        {
            Title = request.Title,
            CreatedByUsername = _resolver.GetCurrentUsername(),
            CreatedAt = DateTimeOffset.Now,
            Tags = [.. Tags.Ensure(_dbContext, request.Tags)]
        };

        var blobs = (await Task.WhenAll(files.Select(async file => await CreateBlobFromUploadedFile(file)))).ToList();
        
        if(request.BlobsFromUnallocated != null) 
        {
            var unallocatedBlobs = await _dbContext.Blobs
                                                    .Where(blob => blob.ArchiveItem == null)
                                                    .Where(blob => request.BlobsFromUnallocated.Contains(blob.Id))
                                                    .ToListAsync();
            foreach (var blob in unallocatedBlobs)
            {
                blobs.Add(blob);
            }
        }

        newArchiveItem.Blobs = blobs;
        _dbContext.ArchiveItems.Add(newArchiveItem);
        await _dbContext.SaveChangesAsync();

        var message = new Message("ArchiveItemCreated", newArchiveItem.Id);
        await _signalRService.PublishToTenantChannel(message);

        return new CreateResponse
        {
            Id = newArchiveItem.Id
        };
    }

    [HttpGet]
    public async Task<ActionResult<int>> CreateAndAttachBlobs([FromQuery] List<int> blobIds) 
    {
        var blobs = await _dbContext.Blobs
                            .Where(blob => blobIds.Contains(blob.Id))
                            .ToListAsync();

        if(!blobs.Any()) 
        {
            return NotFound();
        }

        var archiveItem = new ArchiveItem
        {
            Title = "New archive item",
            CreatedByUsername = _resolver.GetCurrentUsername(),
            CreatedAt = DateTimeOffset.Now,
            Tags = new List<Tag>(),
            Blobs = blobs
        };

        _dbContext.ArchiveItems.Add(archiveItem);

        await _dbContext.SaveChangesAsync();

        await _signalRService.PublishToTenantChannel(new Message("ArchiveItemCreated", archiveItem.Id));
        await _signalRService.PublishToTenantChannel(new Message("BlobsAllocated", blobIds));

        return archiveItem.Id;
    }

    [HttpPut]
    public async Task<ActionResult> Update([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
    {
        var updateRequest = JsonConvert.DeserializeObject<UpdateRequest>(rawRequest);
        if(updateRequest == null) 
        {
            return BadRequest();
        }

        var archiveItem = await _dbContext.ArchiveItems
            .Include(item => item.Blobs)
            .Include(item => item.Tags)
            .SingleOrDefaultAsync(item => item.Id == updateRequest.Id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        var blobs = (await Task.WhenAll(files.Select(async file => await CreateBlobFromUploadedFile(file)))).ToList();

        if(updateRequest.BlobsFromUnallocated != null) 
        {
            var unallocatedBlobs = _dbContext.Blobs.Where(blob => blob.ArchiveItem == null && updateRequest.BlobsFromUnallocated.Contains(blob.Id)).ToList();
            foreach (var blob in unallocatedBlobs)
            {
                blobs.Add(blob);
            }

            //Same as doing a blob allocate in BlobsController
            await _signalRService.PublishToTenantChannel(new Message("BlobsAllocated", updateRequest.BlobsFromUnallocated));
        }

        if(updateRequest.RemovedBlobs != null && archiveItem.Blobs != null) 
        {
            var removedBlobs = archiveItem.Blobs.Where(blob => updateRequest.RemovedBlobs.Contains(blob.Id)).ToList();
            foreach (var blob in removedBlobs)
            {
                archiveItem.Blobs.Remove(blob);
            }

            //Same as doing unallocate, which puts them back as unallocated blobs
            await _signalRService.PublishToTenantChannel(new Message("AddedBlobs", BlobController.ToUnallocatedBlob(removedBlobs)));
        }

        foreach (var blob in blobs)
        {
            archiveItem.Blobs!.Add(blob);
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
                Id = blob.Id,
                NumberOfPages = blob.PageCount
            }).ToList() ?? [],],
        };
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListResponse>>> List([FromQuery] FilterRequest filterRequest)
    {
        var titleFilter = filterRequest.Title?.ToLowerInvariant() ?? "";
        var tagsFilter = filterRequest.Tags ?? [];

        return await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Tags)
            .ConditionalWhere(!string.IsNullOrEmpty(filterRequest.Title), archiveItem => archiveItem.Title.ToLower().Contains(titleFilter))
            .Where(archiveItem => tagsFilter.All(tag => archiveItem.Tags.Any(t => t.Title == tag)))
            .Select(archiveItem => new ListResponse
            {
                Id = archiveItem.Id,
                Title = archiveItem.Title,
                Tags = archiveItem.Tags.Select(tag => tag.Title),
                CreatedAt = archiveItem.CreatedAt,
            })
            .OrderBy(archItem => archItem.Title == null ? (int?)null : archItem.Title.ToLower().IndexOf(titleFilter))
            .ThenBy(archItem => archItem.Title == null ? null : archItem.Title.ToLower())
            .ToListAsync();
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


    private async Task<Blob> CreateBlobFromUploadedFile(IFormFile file)
    {
        var stream = file.OpenReadStream();
            
        return new Blob
        {
            FileHash = _fileProvider.ComputeSha256Hash(stream),
            MimeType = file.ContentType,
            OriginalFilename = file.FileName,
            PageCount = PreviewGenerator.GetDocumentPageCount(file.ContentType, stream),
            FileSize = file.Length,
            UploadedAt = DateTimeOffset.Now,
            UploadedByUsername = _resolver.GetCurrentUsername(),
            StoreRoot = StoreRoot.FileStorage.ToString(),
            PathInStore = await _fileProvider.Store(file.FileName, file.ContentType, stream)
        };
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
        public required IEnumerable<string> Tags { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    public class CreateRequest
    {
        public required string Title { get; set; }
        public required List<string> Tags { get; set; }
        public int[]? BlobsFromUnallocated { get; set; }
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
        public int[]? BlobsFromUnallocated { get; set; }
        public int[]? RemovedBlobs { get; set; }
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
            public int Id { get; set; }
            public int NumberOfPages { get; set; }
        }
    }

    public class FilterRequest
    {
        public string? Title { get; set; }
        public string[]? Tags { get; set; } = [];
    }
    #endregion
}

