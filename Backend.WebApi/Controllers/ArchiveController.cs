using Backend.Core.Providers;
using Backend.DbModel.Database;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize]
public class ArchiveController(MpaDbContext _dbContext, IFileStorageProvider _fileProvider) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ArchiveItemResponse>>> GetArchiveItemList(ListRequest request)
    {
        // return Ok();
        return await _dbContext.ArchiveItems
            .Select(item => new ArchiveItemResponse { Id = item.Id, Title = item.Title, Created = item.Created })
            .ToListAsync();
    }
    
    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult> PostArchiveItem(ArchiveItemRequest archiveItem)
    {
        var blobs = new List<Blob>();
        foreach (var blob in archiveItem.Blobs)
        {
            var filePath = await _fileProvider.StoreFile(blob.FileName, blob.Data);
            blobs.Add(new Blob
            {
                PathInStore = filePath,
                StoreRoot = StoreRoot.FileStorage.ToString()
            });
        }
        
        _dbContext.ArchiveItems.Add(new ArchiveItem
        {
            Created = DateTime.Now,
            Title = archiveItem.Title,
            Tags = new List<Tag>(),
            Blobs = blobs
        });

        await _dbContext.SaveChangesAsync();
        return Ok();
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ArchiveItemResponse>> GetArchivedItem(int id)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .SingleOrDefaultAsync(x => x.Id == id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        var archiveBlobTasks = archiveItem.Blobs.Select(async blob =>
        {
            var file = await _fileProvider.GetFile(blob.PathInStore);
            return new ArchiveItemResponse.ArchiveBlob
            {
                FileName = file.Metadata.OriginalFilename,
                Uploaded = file.Metadata.Uploaded,
                Data = file.Data,
                Size = file.Metadata.Size,
                UploadedBy = file.Metadata.UploadedBy
            };
        });

        var archiveBlobs = await Task.WhenAll(archiveBlobTasks);
    
        return new ArchiveItemResponse
        {
            Title = archiveItem.Title,
            ArchiveBlobs = archiveBlobs.ToList()
        };
    }

    [HttpDelete]
    [AllowAnonymous]
    public async Task<ActionResult> DeleteArchivedItem(int id)
    {
        var archiveItem = await _dbContext.ArchiveItems
            .Include(archiveItem => archiveItem.Blobs)
            .SingleOrDefaultAsync(x => x.Id == id);

        if (archiveItem == null)
        {
            return NotFound();
        }

        foreach (var blob in archiveItem.Blobs)
        {
            _fileProvider.DeleteFile(blob.PathInStore);
            _dbContext.Blobs.Remove(blob);
        }

        _dbContext.ArchiveItems.Remove(archiveItem);
        await _dbContext.SaveChangesAsync();

        return Ok();
    }

    public class ArchiveItemRequest
    {
        public string Title { get; set; }
        public List<ArchiveBlobRequest> Blobs { get; set; }

        public class ArchiveBlobRequest
        {
            public string FileName { get; set; }
            public string Data { get; set; }    
        }
    }

    
    public class ListRequest
    {
        //TODO: Is filtering or paging needed?
    }

    public class ArchiveItemResponse
    {
        public int Id { get; set; }
        public required string Title { get; set; }
        public DateTimeOffset Created { get; set; }
        public List<ArchiveBlob> ArchiveBlobs { get; set; }

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

