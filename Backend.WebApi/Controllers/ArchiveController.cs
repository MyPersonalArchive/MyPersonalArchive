using Backend.Core.Providers;
using Backend.DbModel.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]")]
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
            .Select(item => new ListResponse {
                Id = item.Id,
                Title = item.Title,
                Tags = item.Tags.Select(tag => tag.Title).ToList(),
                CreatedAt = item.CreatedAt
            })
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult> PostArchiveItem(PostArchiveItemRequest archiveItem)
    {
        var blobs = new List<Blob>();
        var tags = new List<Tag>();
        foreach (var blob in archiveItem.Blobs)
        {
            var filePath = await _fileProvider.StoreFile(blob.FileName, blob.Data);
            blobs.Add(new Blob
            {
                PathInStore = filePath,
                StoreRoot = StoreRoot.FileStorage.ToString(),
            });

            var blobTags = blob.Tags.Select(tag => new Tag
            {
                Title = tag.Title,
            });
            tags.AddRange(blobTags);
        }

        _dbContext.ArchiveItems.Add(new ArchiveItem
        {
            CreatedAt = DateTime.Now,
            Title = archiveItem.Title,
            Tags = tags,
            Blobs = blobs
        });

        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpPatch]
    public async Task<ActionResult> UpdateArchiveItem(UpdateArchiveItemRequest updateRequest)
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
                    case UpdateArchiveItemRequest.ArchiveUpdateActionType.Added:
                        var filePath = await _fileProvider.StoreFile(blob.FileName, blob.Data);
                        archiveItem.Blobs.Add(new Blob
                        {
                            PathInStore = filePath,
                            StoreRoot = StoreRoot.FileStorage.ToString()
                        });
                        break;
                    case UpdateArchiveItemRequest.ArchiveUpdateActionType.Deleted:
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
                            case UpdateArchiveItemRequest.ArchiveUpdateActionType.Added:
                                archiveItem.Tags.Add(new Tag
                                {
                                    Title = tag.Title,
                                });
                                break;
                            case UpdateArchiveItemRequest.ArchiveUpdateActionType.Deleted:
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

    [HttpGet("{id}")]
    public async Task<ActionResult<GetArchiveItemResponse>> GetArchivedItem(int id)
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
            return new GetArchiveItemResponse.ArchiveBlob
            {
                FileName = file.Metadata.OriginalFilename,
                Uploaded = file.Metadata.UploadedAt,
                Data = file.Data,
                Size = file.Metadata.Size,
                UploadedBy = file.Metadata.UploadedBy
            };
        });

        var archiveBlobs = await Task.WhenAll(archiveBlobTasks);

        return new GetArchiveItemResponse
        {
            Id = archiveItem.Id,
            Title = archiveItem.Title,
            CreatedAt = archiveItem.CreatedAt,
            ArchiveBlobs = archiveBlobs.ToList()
        };
    }

    [HttpDelete]
    public async Task<ActionResult> DeleteArchivedItem(int id)
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


    public class PostArchiveItemRequest
    {
        public required string Title { get; set; }
        public required List<ArchiveBlobRequest> Blobs { get; set; }

        public class ArchiveBlobRequest
        {
            public required List<ArchiveTagRequest> Tags { get; set; }
            public required string FileName { get; set; }
            public required string Data { get; set; }
        }

        public class ArchiveTagRequest
        {
            public required string Title { get; set; }
        }
    }

    public class UpdateArchiveItemRequest
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

    public class GetArchiveItemResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
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
}

