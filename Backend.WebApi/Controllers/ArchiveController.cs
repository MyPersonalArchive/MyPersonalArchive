using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Backend.WebApi.Cqrs;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Controllers;


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
	private readonly IFileStorageProvider _fileProvider;
	private readonly IAmbientDataResolver _resolver;
	private readonly ArchiveItemService _archiveItemService;
	private readonly BlobService _blobService;
	private readonly StoredFilterService _storedFilterService;

	public ArchiveController(MpaDbContext dbContext, IFileStorageProvider fileProvider, IAmbientDataResolver resolver, ArchiveItemService archiveItemService, BlobService blobService, StoredFilterService storedFilterService)
	{
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
		_archiveItemService = archiveItemService;
		_blobService = blobService;
		_storedFilterService = storedFilterService;
	}


	[HttpPost]
	public async Task<ActionResult<CreateResponse>> Create([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
	{
		var createRequest = JsonSerializer.Deserialize<CreateRequest>(rawRequest, _jsonSerializerOptions);
		if (createRequest == null)
		{
			return BadRequest();
		}

		var newArchiveItem = new ArchiveItem
		{
			Title = createRequest.Title,
			CreatedByUsername = _resolver.GetCurrentUsername(),
			CreatedAt = DateTimeOffset.Now,
			DocumentDate = createRequest.DocumentDate,
			Tags = [.. Tags.Ensure(_dbContext, createRequest.Tags)],
			Metadata = createRequest.Metadata,
			LastUpdated = DateTimeOffset.Now
		};

		var blobs = (await Task.WhenAll(files.Select(async file => await CreateBlobFromUploadedFile(file)))).ToList();

		if (createRequest.BlobsFromUnallocated != null)
		{
			var unallocatedBlobs = await _dbContext.Blobs
													.Where(blob => blob.ArchiveItem == null)
													.Where(blob => createRequest.BlobsFromUnallocated.Contains(blob.Id))
													.ToListAsync();
			foreach (var blob in unallocatedBlobs)
			{
				blobs.Add(blob);
			}
		}

		newArchiveItem.Blobs = blobs;
		_dbContext.ArchiveItems.Add(newArchiveItem);
		await _dbContext.SaveChangesAsync();

		await _archiveItemService.PublishArchiveItemsAddedMessage([newArchiveItem]);

		return new CreateResponse
		{
			Id = newArchiveItem.Id
		};
	}

	[HttpGet]
	public async Task<ActionResult<int>> CreateAndAttachBlobs([FromQuery] List<int> blobIds)
	{
		var blobs = await _dbContext.Blobs
							.Where(blob => blobIds.Contains(blob.Id))
							.ToListAsync();

		if (!blobs.Any())
		{
			return NotFound();
		}

		var archiveItem = new ArchiveItem
		{
			//TODO: Title, Tags and Metadata should be part of the payload...
			//  (So that the user can set them before creating the archive item, or cancel the creation)
			Title = "New archive item",
			CreatedByUsername = _resolver.GetCurrentUsername(),
			CreatedAt = DateTimeOffset.Now,
			Blobs = blobs,
			Tags = new List<Tag>(),
			Metadata = new JsonObject(),
			LastUpdated = DateTimeOffset.Now
		};

		_dbContext.ArchiveItems.Add(archiveItem);

		await _dbContext.SaveChangesAsync();

		await _archiveItemService.PublishArchiveItemsAddedMessage([archiveItem]);
		await _blobService.PublishBlobsUpdatedMessage(blobs);

		return archiveItem.Id;
	}

	[HttpPut]
	public async Task<ActionResult> Update([FromForm] string rawRequest, [FromForm] IFormFileCollection files)
	{
		var updateRequest = JsonSerializer.Deserialize<UpdateRequest>(rawRequest, _jsonSerializerOptions);
		if (updateRequest == null)
		{
			return BadRequest();
		}

		var archiveItem = await _dbContext.ArchiveItems
			.Include(item => item.Blobs)
			.Include(item => item.Tags)
			.SingleOrDefaultAsync(item => item.Id == updateRequest.Id);

		if (archiveItem == null)
		{
			return NotFound();
		}

		var blobs = (await Task.WhenAll(files.Select(async file => await CreateBlobFromUploadedFile(file)))).ToList();

		if (updateRequest.BlobsFromUnallocated != null && updateRequest.BlobsFromUnallocated.Length > 0)
		{
			var unallocatedBlobs = _dbContext.Blobs.Where(blob => blob.ArchiveItem == null && updateRequest.BlobsFromUnallocated.Contains(blob.Id)).ToList();
			foreach (var blob in unallocatedBlobs)
			{
				blobs.Add(blob);
			}

			await _blobService.PublishBlobsUpdatedMessage(unallocatedBlobs);
		}

		if (updateRequest.RemovedBlobs != null && updateRequest.RemovedBlobs.Length > 0 && archiveItem.Blobs != null)
		{
			var removedBlobs = archiveItem.Blobs!.Where(blob => updateRequest.RemovedBlobs.Contains(blob.Id)).ToList();
			foreach (var blob in removedBlobs)
			{
				archiveItem.Blobs.Remove(blob);
			}

			await _blobService.PublishBlobsUpdatedMessage(removedBlobs);
		}

		foreach (var blob in blobs)
		{
			archiveItem.Blobs!.Add(blob);
		}

		var removedTags = archiveItem.Tags.Where(tag => !updateRequest.Tags.Contains(tag.Title));
		foreach (var tag in removedTags)
		{
			archiveItem.Tags.Remove(tag);
			if (tag.ArchiveItems != null && tag.ArchiveItems.Count == 1 && tag.ArchiveItems.Contains(archiveItem))
			{
				_dbContext.Tags.Remove(tag);
			}
		}

		archiveItem.Title = updateRequest.Title;
		archiveItem.Tags = [.. Tags.Ensure(_dbContext, updateRequest.Tags)];
		archiveItem.Metadata = updateRequest.Metadata;
		archiveItem.DocumentDate = updateRequest.DocumentDate;
		archiveItem.LastUpdated = DateTimeOffset.Now;

		await _dbContext.SaveChangesAsync();

		await _archiveItemService.PublishArchiveItemsUpdatedMessage([archiveItem]);

		return NoContent();
	}


	private async Task<Blob> CreateBlobFromUploadedFile(IFormFile file)
	{
		using var stream = file.OpenReadStream();

		return new Blob
		{
			FileHash = stream.ComputeSha256Hash(),
			MimeType = file.ContentType,
			OriginalFilename = file.FileName,
			PageCount = PreviewGenerator.GetDocumentPageCount(file.ContentType, stream),
			FileSize = file.Length,
			UploadedAt = DateTimeOffset.Now,
			UploadedByUsername = _resolver.GetCurrentUsername(),
			StoreRoot = StoreRoot.FileStorage.ToString(),
			PathInStore = await _fileProvider.Store(file.FileName, file.ContentType, stream)
		};
	}


	#region Request and response models


	public class CreateRequest
	{
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public required JsonObject Metadata { get; set; }
		public int[]? BlobsFromUnallocated { get; set; }
	}

	public class CreateResponse
	{
		public required int Id { get; set; }
	}

	public class UpdateRequest
	{
		public int Id { get; set; }
		public required string Title { get; set; }
		public DateTimeOffset? DocumentDate { get; set; }
		public required List<string> Tags { get; set; }
		public required JsonObject Metadata { get; set; }
		public int[]? BlobsFromUnallocated { get; set; }
		public int[]? RemovedBlobs { get; set; }
	}
	#endregion
}

