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

    public BlobController(MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
        _resolver = resolver;
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
        [FromQuery] int pageNumber = 1
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
 

    [HttpPost]
    public async Task<ActionResult> Upload([FromQuery]int archiveItemId, IFormFileCollection files)
    {
        var archiveItem = await _dbContext.ArchiveItems.FindAsync(archiveItemId);
        if (archiveItem == null)
        {
            return NotFound();
        }

        foreach (var file in files)
        {
            var data = new byte[file.Length];
            await file.OpenReadStream().ReadExactlyAsync(data);
            
            var blob = new Blob
            {
                TenantId = archiveItem.TenantId,
                ArchiveItem = archiveItem,
                FileHash = _fileProvider.ComputeSha256Hash(data),
                MimeType = file.ContentType,
                OriginalFilename = file.FileName,
                PageCount = PreviewGenerator.GetDocumentPageCount(file.ContentType, data),
                FileSize = file.Length,
                UploadedAt = DateTimeOffset.Now,
                UploadedByUsername = _resolver.GetCurrentUsername(),
                StoreRoot = StoreRoot.FileStorage.ToString(),
                PathInStore = await _fileProvider.Store(file.FileName, file.ContentType, data)
            };

            _dbContext.Blobs.Add(blob);
        }
        
        await _dbContext.SaveChangesAsync();

        return Ok();
    }

    public enum DimensionEnum
    {
        Small,
        Medium,
        Large
    }
}
