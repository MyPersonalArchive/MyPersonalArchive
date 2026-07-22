using Backend.Mpa.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Mpa.Core.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class BlobController : ControllerBase
{
	private readonly BlobQueryService _blobQueryService;
	private readonly BlobCommandService _blobCommandService;

	public BlobController(BlobQueryService blobQueryService, BlobCommandService blobCommandService)
	{
		_blobQueryService = blobQueryService;
		_blobCommandService = blobCommandService;
	}


	public async Task<ActionResult> GetFile([FromQuery] Guid blobId, [FromQuery] DimensionEnum dimension)
	{
		int maxX, maxY;
		maxX = maxY = dimension switch
		{
			DimensionEnum.Thumbnail => 150,
			DimensionEnum.Small => 300,
			DimensionEnum.Full => int.MaxValue,
			_ => throw new ArgumentOutOfRangeException(nameof(dimension), dimension, null)
		};

		var tuple = dimension == DimensionEnum.Full
			? await _blobQueryService.GetBlobOriginal(blobId)
			: await _blobQueryService.GetBlobPreview(blobId, maxX, maxY, 0, storePreview: true);
		if (!tuple.HasValue)
		{
			return NotFound();
		}

		var (contentStream, mimeType, suggestedFilename) = tuple.Value;

		return File(contentStream, mimeType, suggestedFilename);
	}


	[HttpPost]
	public async Task<ActionResult> Upload(IFormFileCollection files)
	{
		await _blobCommandService.UploadBlobs(files.Select(file => (file.OpenReadStream(), file.FileName, file.ContentType)));
		return NoContent();
	}


	public enum DimensionEnum
	{
		Thumbnail = 1,
		Small = 2,
		Full = 3,
	}
}
