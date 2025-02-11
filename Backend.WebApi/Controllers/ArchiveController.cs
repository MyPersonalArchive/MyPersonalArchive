using Backend.Core.Providers;
using Backend.DbModel.Database;
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

    public ArchiveController(MpaDbContext dbContext, IFileStorageProvider fileProvider)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
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
            StoreRoot = StoreRoot.FileStorage.ToString()
        });

        _dbContext.ArchiveItems.Add(new ArchiveItem
        {
            Title = request.Title,
            CreatedAt = DateTimeOffset.Now,
            Tags = [.. Tags.Ensure(_dbContext, request.Tags)],
            Blobs = [.. blobs]
        });
        _dbContext.SaveChanges();

        return Ok();
    }


    [HttpPatch]
    public async Task<ActionResult> Update(UpdateRequest updateRequest)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .Include(archiveItem => archiveItem.Tags)
            .SingleOrDefaultAsync(x => x.Id == updateRequest.Id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        archiveItem.Title = updateRequest.Title;

        if (archiveItem.Blobs != null)
        {
            foreach (var blob in updateRequest.Blobs)
            {
                switch (blob.Type)
                {
                    case UpdateRequest.ArchiveUpdateActionType.Added:
                        var filePath = await _fileProvider.StoreFile(blob.FileName, blob.Data);
                        archiveItem.Blobs.Add(new Blob
                        {
                            PathInStore = filePath,
                            StoreRoot = StoreRoot.FileStorage.ToString()
                        });
                        break;
                    case UpdateRequest.ArchiveUpdateActionType.Deleted:
                        var blobItem = archiveItem.Blobs.SingleOrDefault(x => x.Id == blob.Id);
                        if (blobItem != null)
                        {
                            _fileProvider.DeleteFile(blobItem.PathInStore);
                            _dbContext.Blobs.Remove(blobItem);
                        }

                        break;
                }

                if (blob.Tags != null)
                {
                    foreach (var tag in blob.Tags)
                    {
                        switch (tag.Type)
                        {
                            case UpdateRequest.ArchiveUpdateActionType.Added:
                                archiveItem.Tags.Add(new Tag
                                {
                                    Title = tag.Title,
                                });
                                break;
                            case UpdateRequest.ArchiveUpdateActionType.Deleted:
                                var tagItem = archiveItem.Tags.SingleOrDefault(x => x.Title == tag.Title);
                                if (tagItem != null)
                                {
                                    archiveItem.Tags.Remove(tagItem);
                                }
                                break;
                        }
                    }
                }
            }
        }

        await _dbContext.SaveChangesAsync();
        return Ok();
    }


    [HttpGet]
    public async Task<ActionResult<GetResponse>> Get([FromQuery] int id)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .SingleOrDefaultAsync(x => x.Id == id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        var archiveBlobTasks = archiveItem.Blobs!.Select(async blob =>
        {
            var file = await _fileProvider.GetFile(blob.PathInStore);
            return new GetResponse.ArchiveBlob
            {
                FileName = file.Metadata.OriginalFilename,
                Uploaded = file.Metadata.UploadedAt,
                Data = file.Data,
                Size = file.Metadata.Size,
                UploadedBy = file.Metadata.UploadedBy
            };
        });

        var archiveBlobs = await Task.WhenAll(archiveBlobTasks);

        return new GetResponse
        {
            Id = archiveItem.Id,
            Title = archiveItem.Title,
            Tags = archiveItem.Tags.Select(tag => tag.Title).ToList(),
            CreatedAt = archiveItem.CreatedAt,
            ArchiveBlobs = archiveBlobs.ToList()
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
        public required List<ArchiveBlobUpdateRequest> Blobs { get; set; }

        public class ArchiveBlobUpdateRequest
        {
            public ArchiveUpdateActionType Type { get; set; }
            public List<ArchiveTagUpdateRequest>? Tags { get; set; }
            public int Id { get; set; }
            public string? FileName { get; set; }
            public string? Data { get; set; }
        }

        public class ArchiveTagUpdateRequest
        {
            public ArchiveUpdateActionType Type { get; set; }
            public string? Title { get; set; }
        }

        public enum ArchiveUpdateActionType
        {
            NoChanges = 0,
            Added = 1,
            Deleted = 2
        }
    }

    public class GetResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public required List<string> Tags { get; set; }
        public required List<ArchiveBlob> ArchiveBlobs { get; set; }

        public class ArchiveBlob
        {
            public required string FileName { get; set; }
            public DateTimeOffset Uploaded { get; set; }
            public required string UploadedBy { get; set; }
            public required string Data { get; set; }
            public long Size { get; set; }
        }
    }
    #endregion
}

