using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Services;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
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

	private readonly MpaDbContext _dbContext;
	private readonly IAmbientDataResolver _resolver;
	private readonly ArchiveItemService _archiveItemService;
	private readonly BlobService _blobService;

	public ArchiveController(MpaDbContext dbContext, IAmbientDataResolver resolver, ArchiveItemService archiveItemService, BlobService blobService)
	{
		_dbContext = dbContext;
		_resolver = resolver;
		_archiveItemService = archiveItemService;
		_blobService = blobService;
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
		var newArchiveItem = await _archiveItemService.CreateArchiveItem(createRequest.Title, createRequest.Tags, createRequest.Metadata, createRequest.BlobsFromUnallocated ?? [], uploadedBlobs);

		return new CreateResponse
		{
			Id = newArchiveItem.Id
		};
	}


	[HttpGet]
	public async Task<ActionResult<Guid>> CreateAndAttachBlobs([FromQuery] IEnumerable<Guid> blobIds)
	{
		var newArchiveItem = await _archiveItemService.CreateArchiveItem("New archive item", [], null, blobIds, []);
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
		var updatedArchiveItem = await _archiveItemService.UpdateArchiveItem(updateRequest.Id, updateRequest.Title, updateRequest.Tags, updateRequest.Metadata, updateRequest.DocumentDate, updateRequest.ExistingBlobIds ?? [], uploadedBlobs);
		if (updatedArchiveItem == null)
		{
			return NotFound();
		}

		return NoContent();
	}


	private async Task<IEnumerable<Blob>> CreateBlobsFromUploadedFiles(IFormFileCollection files)
	{
		var payloads = files.Select(file => (file.OpenReadStream(), file.FileName, file.ContentType));
		var uploadedBlobs = await _blobService.UploadBlobs(payloads);

		return uploadedBlobs;
	}


	#region Request and response models

	public class CreateRequest
	{
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public required JsonObject Metadata { get; set; }
		public Guid[]? BlobsFromUnallocated { get; set; }
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

