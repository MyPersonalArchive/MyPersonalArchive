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
	private readonly JsonSerializerOptions _jsonSerializerOptions = new()
	{
		PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
	};

	private readonly ArchiveItemCommandService _archiveItemCommandService;

	public ArchiveController(ArchiveItemCommandService archiveItemCommandService)
	{
		_archiveItemCommandService = archiveItemCommandService;
	}


	[HttpPost]
	public async Task<ActionResult<CreateResponse>> Create([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
	{
		var createRequest = JsonSerializer.Deserialize<CreateRequest>(rawRequest, _jsonSerializerOptions);
		if (createRequest == null)
		{
			return BadRequest();
		}

		var uploadedBlobs = files.Select(file => (file.OpenReadStream(), file.FileName, file.ContentType));
		var newArchiveItem = await _archiveItemCommandService.CreateArchiveItem(createRequest.Title, createRequest.Tags, createRequest.Metadata, createRequest.ExistingBlobIds, uploadedBlobs);

		return new CreateResponse
		{
			Id = newArchiveItem.Id
		};
	}


	[HttpGet]
	public async Task<ActionResult<Guid>> CreateAndAttachBlobs([FromQuery] IEnumerable<Guid> blobIds)
	{
		var newArchiveItem = await _archiveItemCommandService.CreateArchiveItem("New archive item", [], null, blobIds, []);
		return newArchiveItem.Id;
	}


	[HttpPut]
	public async Task<ActionResult> Update([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
	{
		var updateRequest = JsonSerializer.Deserialize<UpdateRequest>(rawRequest, _jsonSerializerOptions);
		if (updateRequest == null)
		{
			return BadRequest();
		}

		var uploadedBlobs = files.Select(file => (file.OpenReadStream(), file.FileName, file.ContentType));
		var updatedArchiveItem = await _archiveItemCommandService.UpdateArchiveItem(updateRequest.Id, updateRequest.Title, updateRequest.Tags, updateRequest.Metadata, updateRequest.DocumentDate, updateRequest.ExistingBlobIds, uploadedBlobs);
		if (updatedArchiveItem == null)
		{
			return NotFound();
		}

		return NoContent();
	}


	#region Request and response models

	public class CreateRequest
	{
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public required JsonObject Metadata { get; set; }
		public required Guid[] ExistingBlobIds { get; set; }
	}

	public class CreateResponse
	{
		public required Guid Id { get; set; }
	}

	public class UpdateRequest
	{
		public Guid Id { get; set; }
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public required JsonObject Metadata { get; set; }
		public required Guid[] ExistingBlobIds { get; set; }
	}
	#endregion
}

