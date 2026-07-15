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
		var tuple = await _blobQueryService.GetBlob(blobId);
		if(!tuple.HasValue)
		{
			return NotFound();
		}
		
		var contentStream = tuple.Value.contentStream;	//TODO: using - to dispose the stream after returning the file?
		var metadata = tuple.Value.metadata;

		//User our libvips preview mechanism if image or pdf
		if (dimension != DimensionEnum.Full && (metadata.MimeType!.StartsWith("image/") || metadata.MimeType == "application/pdf"))
		{
			int maxX, maxY;
			switch (dimension)
			{
				case DimensionEnum.Thumbnail:
					maxX = maxY = 150;
					break;
				case DimensionEnum.Small:
					maxX = maxY = 300;
					break;
				case DimensionEnum.Full:
					maxX = maxY = 800;
					break;
				default:
					return BadRequest();
			}

			var previewStream = PreviewGenerator.GeneratePreview(contentStream, metadata.MimeType, maxX, maxY, 0);	//TODO: using - to dispose the stream after returning the file?
			return File(previewStream, "image/png", $"{metadata.OriginalFilename}_preview(0).png");
		}

		return File(contentStream, metadata.MimeType, metadata.OriginalFilename);
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
