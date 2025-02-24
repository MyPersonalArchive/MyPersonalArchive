using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.AspNetCore.Authorization;
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
    private readonly AmbientDataResolver _resolver;

    public ArchiveController(MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
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
    public async Task<ActionResult> Create(CreateRequest request)
    {
        var tasks = request.Blobs.Select(blob => _fileProvider.StoreFile(blob.FileName, blob.FileData));
        var filenames = await Task.WhenAll(tasks);
        var blobs = filenames.Select((filename, index) => new Blob
        {
            PathInStore = filename,
            StoreRoot = StoreRoot.FileStorage.ToString(),
            // UploadedByUsername = _resolver.GetCurrentUsername()!,
            UploadedAt = DateTimeOffset.Now,
            Metadata = new Metadata
            {
                OriginalFilename = request.Blobs[index].FileName,
                FileSize = request.Blobs[index].FileData.Length,
                Hash = new byte[32]
            }
        });

        _dbContext.ArchiveItems.Add(new ArchiveItem
        {
            Title = request.Title,
            // CreatedByUsername = _resolver.GetCurrentUsername()!,
            CreatedAt = DateTimeOffset.Now,
            Tags = [.. Tags.Ensure(_dbContext, request.Tags)],
            Blobs = [.. blobs]
        });
        _dbContext.SaveChanges();

        return Ok();
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

        // if (archiveItem.Blobs != null)
        // {
        //     foreach (var blob in updateRequest.Blobs)
        //     {
        //         switch (blob.Type)
        //         {
        //             case UpdateRequest.ArchiveUpdateActionType.Added:
        //                 var filePath = await _fileProvider.StoreFile(blob.FileName, blob.Data);
        //                 archiveItem.Blobs.Add(new Blob
        //                 {
        //                     PathInStore = filePath,
        //                     StoreRoot = StoreRoot.FileStorage.ToString()
        //                 });
        //                 break;
        //             case UpdateRequest.ArchiveUpdateActionType.Deleted:
        //                 var blobItem = archiveItem.Blobs.SingleOrDefault(x => x.Id == blob.Id);
        //                 if (blobItem != null)
        //                 {
        //                     _fileProvider.DeleteFile(blobItem.PathInStore);
        //                     _dbContext.Blobs.Remove(blobItem);
        //                 }

        //                 break;
        //         }

        //         if (blob.Tags != null)
        //         {
        //             foreach (var tag in blob.Tags)
        //             {
        //                 switch (tag.Type)
        //                 {
        //                     case UpdateRequest.ArchiveUpdateActionType.Added:
        //                         archiveItem.Tags.Add(new Tag
        //                         {
        //                             Title = tag.Title,
        //                         });
        //                         break;
        //                     case UpdateRequest.ArchiveUpdateActionType.Deleted:
        //                         var tagItem = archiveItem.Tags.SingleOrDefault(x => x.Title == tag.Title);
        //                         if (tagItem != null)
        //                         {
        //                             archiveItem.Tags.Remove(tagItem);
        //                         }
        //                         break;
        //                 }
        //             }
        //         }
        //     }
        // }

        await _dbContext.SaveChangesAsync();

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

        // var archiveBlobTasks = archiveItem.Blobs!.Select(async blob =>
        // {
        //     var file = await _fileProvider.GetFile(blob.PathInStore);
        //     return new GetResponse.Blob
        //     {
        //         FileName = file.Metadata.OriginalFilename,
        //         Uploaded = file.Metadata.UploadedAt,
        //         Data = file.Data,
        //         Size = file.Metadata.Size,
        //         UploadedBy = file.Metadata.UploadedBy
        //     };
        // });

        // var archiveBlobs = await Task.WhenAll(archiveBlobTasks);

        return new GetResponse
        {
            Id = archiveItem.Id,
            Title = archiveItem.Title,
            Tags = [.. archiveItem.Tags.Select(tag => tag.Title)],
            BlobIds = [.. archiveItem.Blobs.Select(blob => blob.Id)],
            CreatedAt = archiveItem.CreatedAt,
            // ArchiveBlobs = [.. archiveBlobs]
        };
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
        public required List<Blob> Blobs { get; set; }

        public class Blob
        {
            public required string FileName { get; set; }
            public required string FileData { get; set; }
        }
    }

    public class UpdateRequest
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public required List<string> Tags { get; set; }
        // public required List<Blob> Blobs { get; set; }

        // public class Blob
        // {
        //     public ArchiveUpdateActionType Type { get; set; }
        //     public int Id { get; set; }
        //     public string? FileName { get; set; }
        //     public string? Data { get; set; }
        // }

        // public enum ArchiveUpdateActionType
        // {
        //     NoChanges = 0,
        //     Added = 1,
        //     Deleted = 2
        // }
    }

    public class GetResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public required List<string> Tags { get; set; }
        public required List<int> BlobIds { get; set; }

        // public class Blob
        // {
        //     public required string FileName { get; set; }
        //     public DateTimeOffset Uploaded { get; set; }
        //     public required string UploadedBy { get; set; }
        //     public required string Data { get; set; }
        //     public long Size { get; set; }
        // }
    }
    #endregion
}

