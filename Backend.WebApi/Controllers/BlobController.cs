using System.Formats.Asn1;
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
public class BlobController : ControllerBase
{
    private readonly MpaDbContext _dbContext;
    private IFileStorageProvider _fileProvider;
    private readonly AmbientDataResolver _resolver;
    private readonly SignalRService _signalRService;

    public BlobController(MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver, SignalRService signalRService)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
        _resolver = resolver;
        _signalRService = signalRService;
    }


    [HttpGet]
    public async Task<ActionResult<FileContentResult>> Download([FromQuery] int blobId)
    {
        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
        if (blob == null)
        {
            return NotFound();
        }

        var stream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
        return File(stream, metadata.MimeType, metadata.OriginalFilename);
    }


    [HttpGet]
    public async Task<ActionResult<byte[]>> Preview(
        [FromQuery] int blobId,
        [FromQuery] DimensionEnum dimension,
        [FromQuery] int pageNumber = 0
    )
    {
        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
        if (blob == null)
        {
            return NotFound();
        }

        int maxX, maxY;
        switch (dimension)
        {
            case DimensionEnum.XSmall:
                maxX = maxY = 95;
                break;
            case DimensionEnum.Small:
                maxX = maxY = 150;
                break;
            case DimensionEnum.Medium:
                maxX = maxY = 300;
                break;
            case DimensionEnum.Large:
                maxX = maxY = 800;
                break;
            default:
                return BadRequest();
        }

        var originalStream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
        var previewStream = PreviewGenerator.GeneratePreview(originalStream, metadata.MimeType, maxX, maxY, pageNumber);
        return File(previewStream, "image/jpg", $"{metadata.OriginalFilename}_preview({pageNumber}).jpg");
    }

    [HttpGet]
    public async Task<ActionResult<OrphanHeapResponse>> OrphanHeap(int? limit)
    {
        var total = await _dbContext.Blobs
                            .Where(blob => blob.ArchiveItem == null)
                            .CountAsync();

        
        IEnumerable<OrphanBlob>  orphanBlobs = (await _dbContext.Blobs
            .Include(blob => blob.UploadedBy)
            .Where(blob => blob.ArchiveItem == null)
            .Select(blob => new OrphanBlob
            {
                Id = blob.Id,
                FileName = blob.OriginalFilename,
                FileSize = blob.FileSize,
                PageCount = blob.PageCount,
                UploadedAt = blob.UploadedAt,
                UploadedByUser = blob.UploadedBy!.Fullname
            })
            .ToListAsync()) // Cannot orderBy dateTimeOffset without ToListing first
            .OrderByDescending(blob => blob.UploadedAt);

        if (limit.HasValue)
        {
            orphanBlobs = orphanBlobs.Take(limit.Value);
        }

        return new OrphanHeapResponse
        {
            Total = total,
            Blobs = orphanBlobs
        };
    }
 

    [HttpPost]
    public async Task<ActionResult> Upload(IFormFileCollection files)
    {
        foreach (var file in files)
        {
            var stream = file.OpenReadStream();
            
            var blob = new Blob
            {
                TenantId = _resolver.GetCurrentTenantId()!.Value,
                ArchiveItem = null,
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

            _dbContext.Blobs.Add(blob);
        }
        
        await _dbContext.SaveChangesAsync();

        var message = new Message("OrphanHeapUpdated");
        await _signalRService.PublishToTenantChannel(message);

        return Ok();
    }

    [HttpDelete]
    public async Task<ActionResult> Delete([FromQuery] int[] blobIds)
    {
        var blobs = await _dbContext.Blobs.Where(x => blobIds.Contains(x.Id)).ToListAsync();
        if (!blobs.Any())
        {
            return NotFound();
        }

        blobs.ForEach(blob => _fileProvider.DeleteFile(blob.PathInStore));
        _dbContext.Blobs.RemoveRange(blobs);

        await _dbContext.SaveChangesAsync();

        return Ok();
    }

    public class OrphanHeapResponse
    {
        public int Total { get; set; }
        public required IEnumerable<OrphanBlob> Blobs { get; set; }
    }

    public class OrphanBlob
    {
        public int Id { get; set; }
        public string? FileName { get; set; }
        public long FileSize { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
        public required string UploadedByUser { get; set; }
        public int PageCount { get; set; }
    }

    public enum DimensionEnum
    {
        XSmall = 1,
        Small = 2,
        Medium = 3,
        Large = 4
    }
}
