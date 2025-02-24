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

    public BlobController(MpaDbContext dbContext, IFileStorageProvider fileProvider)
    {
        _dbContext = dbContext;
        _fileProvider = fileProvider;
    }


    [HttpGet]
    public async Task<ActionResult<FileContentResult>> Download([FromQuery] int blobId)
    {
        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == new BlobId(blobId));
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
        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == new BlobId(blobId));
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
        string mimeType = metadata.MimeType.Replace("data:", "").Replace(";base64,", "");
        var previewStream = PreviewGenerator.GeneratePreview(originalStream, mimeType, maxX, maxY, pageNumber);
        return File(previewStream, "image/jpg", $"{metadata.OriginalFilename}_preview({pageNumber}).jpg");
    }


    public enum DimensionEnum
    {
        Small,
        Medium,
        Large
    }

}
