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
    public async Task<ActionResult<FileContentResult>> GetRawFile([FromQuery] int blobId)
    {
        //TODO: Idea for later: Require special role or priviliges to download raw files

        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
        if (blob == null)
        {
            return NotFound();
        }

        var stream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
        return File(stream, metadata.MimeType, metadata.OriginalFilename);
    }


    [HttpGet]
    public async Task<ActionResult<byte[]>> Preview([FromQuery] int blobId, [FromQuery] DimensionEnum dimensions, [FromQuery] int pageNo = 1)
    {
        // IMPORTANT: GetPreviewImage must be a HTTP GET request, so that the URL can be used in <img src="..."> tags
        // TODO: Idea for later: preview images can have watermarks

        var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
        if (blob == null)
        {
            return NotFound();
        }

        var stream = _fileProvider.GetPreview(blob.PathInStore, 400, 400, pageNo, out var metadata);
        return File(stream, "image/jpg", $"{metadata.OriginalFilename}_preview({pageNo}).jpg");
    }


    public enum DimensionEnum
    {
        Small,
        Medium,
        Large
    }
}
