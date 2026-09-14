using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Mpa.Core.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Mpa.Core.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class ArchiveController : ControllerBase
{
	private readonly ArchiveItemCommandService _archiveItemCommandService;

	public ArchiveController(ArchiveItemCommandService archiveItemCommandService)
	{
		_archiveItemCommandService = archiveItemCommandService;
	}


	[HttpPut]
	public async Task<ActionResult> Store([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
	{
		var storeRequest = JsonSerializer.Deserialize<StoreRequest>(rawRequest, JsonSerializerDefaults.Options);
		if (storeRequest == null)
		{
			return BadRequest();
		}

		var uploadedBlobs = files.Select(file => (file.OpenReadStream(), file.FileName, file.ContentType));
		await _archiveItemCommandService.StoreArchiveItem(storeRequest.Id, storeRequest.Title, storeRequest.Tags, storeRequest.Notes, storeRequest.Metadata, storeRequest.DocumentDate, storeRequest.ExistingBlobIds, uploadedBlobs);

		return NoContent();
	}


	#region Request and response models
	public class StoreRequest
	{
		public Guid Id { get; set; }
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public string? Notes { get; set; }
		public required JsonObject Metadata { get; set; }
		public required Guid[] ExistingBlobIds { get; set; }
	}
	#endregion
}

