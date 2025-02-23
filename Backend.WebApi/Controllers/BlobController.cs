using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
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
        [FromQuery] DimensionEnum dimensions,
        [FromQuery] int pageNumber = 1
    )
    {
        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
        if (blob == null)
        {
            return NotFound();
        }

        var originalStream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
        string mimeType = metadata.MimeType.Replace("data:", "").Replace(";base64,", "");
        var previewStream = PreviewGenerator.GeneratePreview(originalStream, mimeType, 300, 300, pageNumber);
        return File(previewStream, "image/jpg", $"{metadata.OriginalFilename}_preview({pageNumber}).jpg");
    }


    public enum DimensionEnum
    {
        Small,
        Medium,
        Large
    }

}
