using System.Formats.Asn1;
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
[Authorize(Policy = "TenantIdPolicy")]
public class BlobController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private IFileStorageProvider _fileProvider;
	private readonly AmbientDataResolver _resolver;
	private readonly BlobService _blobService;

	public BlobController(MpaDbContext dbContext, IFileStorageProvider fileProvider, AmbientDataResolver resolver, BlobService blobService)
	{
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
		_blobService = blobService;
	}


	[HttpGet]
	public async Task<ActionResult> Download([FromQuery] int blobId)
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
	public async Task<ActionResult> Preview(
		[FromQuery] int blobId,
		[FromQuery] DimensionEnum dimension,
		[FromQuery] int pageNumber = 0
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

		var originalStream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
		var previewStream = PreviewGenerator.GeneratePreview(originalStream, metadata.MimeType, maxX, maxY, pageNumber);
		return File(previewStream, "image/jpg", $"{metadata.OriginalFilename}_preview({pageNumber}).jpg");
	}

	//If we decide to go away from libvips we will remove "Preview" and only have this
	public async Task<ActionResult> GetFile([FromQuery] int blobId, [FromQuery] DimensionEnum dimension)
	{
		var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
		if (blob == null)
		{
			return NotFound();
		}

		//User our libvips preview mechanism if image or pdf
		if (dimension != DimensionEnum.Full && (blob.MimeType.StartsWith("image/") || blob.MimeType == "application/pdf"))
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

			var originalStream = _fileProvider.GetFile(blob.PathInStore, out var metadata);
			var previewStream = PreviewGenerator.GeneratePreview(originalStream, metadata.MimeType, maxX, maxY, 0);
			return File(previewStream, "image/png", $"{metadata.OriginalFilename}_preview(0).png");
		}

		return PhysicalFile(blob.PathInStore, blob.MimeType);
	}



	[HttpGet]
	public async Task<ActionResult<GetBlobResponse>> Get(int id)
	{
		var blob = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Select(blob => new GetBlobResponse
			{
				Id = blob.Id,
				FileName = blob.OriginalFilename,
				FileSize = blob.FileSize,
				PageCount = blob.PageCount,
				UploadedAt = blob.UploadedAt,
				UploadedByUser = blob.UploadedBy!.Fullname,
				MimeType = blob.MimeType,
				IsAllocated = blob.ArchiveItem != null
			})
			.SingleOrDefaultAsync(blob => blob.Id == id);

		if (blob == null)
		{
			return NotFound();
		}

		return blob;
	}


	[HttpGet]
	public async Task<ActionResult<IEnumerable<ListBlobResponse>>> List()
	{
		var total = await _dbContext.Blobs
							.Where(blob => blob.ArchiveItem == null)
							.CountAsync();

		var blobs = (await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Select(blob => new ListBlobResponse
			{
				Id = blob.Id,
				FileName = blob.OriginalFilename,
				FileSize = blob.FileSize,
				PageCount = blob.PageCount,
				UploadedAt = blob.UploadedAt,
				UploadedByUser = blob.UploadedBy!.Fullname,
				MimeType = blob.MimeType,
				IsAllocated = blob.ArchiveItem != null
			})
			.ToListAsync()) // Cannot orderBy dateTimeOffset without ToListing first
			.OrderByDescending(blob => blob.UploadedAt)
			.ToList();

		return blobs;
	}


	[HttpPut]
	public async Task<ActionResult> Allocate([FromQuery] int[] blobIds, [FromQuery] int archiveItemId)
	{
		var archiveItem = _dbContext.ArchiveItems
								.Include(archiveItem => archiveItem.Blobs)
								.SingleOrDefault(archiveItem => archiveItem.Id == archiveItemId);
		if (archiveItem == null)
		{
			return BadRequest();
		}

		var blobs = _dbContext.Blobs.Where(blob => blobIds.Contains(blob.Id)).ToList();
		foreach (var blob in blobs)
		{
			archiveItem.Blobs!.Add(blob);
		}

		await _dbContext.SaveChangesAsync();

		await _blobService.PublishBlobsUpdatedMessage(blobs);

		return NoContent();
	}

	[HttpPost]
	public async Task<ActionResult> Upload(IFormFileCollection files)
	{
		var blobs = new List<Blob>();
		foreach (var file in files)
		{
			var stream = file.OpenReadStream();

			var blob = new Blob
			{
				TenantId = _resolver.GetCurrentTenantId()!.Value,
				ArchiveItem = null,
				FileHash = _fileProvider.ComputeSha256Hash(stream),
				MimeType = file.ContentType,
				OriginalFilename = file.FileName,
				PageCount = PreviewGenerator.GetDocumentPageCount(file.ContentType, stream),
				FileSize = file.Length,
				UploadedAt = DateTimeOffset.Now,
				UploadedByUsername = _resolver.GetCurrentUsername(),
				StoreRoot = StoreRoot.FileStorage.ToString(),
				PathInStore = await _fileProvider.Store(file.FileName, file.ContentType, stream)
			};
			blobs.Add(blob);
		}

		await _dbContext.Blobs.AddRangeAsync(blobs);
		await _dbContext.SaveChangesAsync();

		await _blobService.PublishBlobsAddedMessage(blobs);

		return NoContent();
	}

	[HttpDelete]
	public async Task<ActionResult> Delete([FromQuery] int[] blobIds)
	{
		var blobs = await _dbContext.Blobs.Where(x => blobIds.Contains(x.Id)).ToListAsync();
		if (!blobs.Any())
		{
			return NotFound();
		}

		blobs.ForEach(blob => _fileProvider.DeleteFile(blob.PathInStore));
		_dbContext.Blobs.RemoveRange(blobs);

		await _dbContext.SaveChangesAsync();

		await _blobService.PublishBlobsDeletedMessage(blobs);

		return NoContent();
	}

	public static List<ListBlobResponse> ToListBlobResponse(List<Blob> blobs)
	{
		return blobs.Select(blob => new ListBlobResponse
		{
			Id = blob.Id,
			FileName = blob.OriginalFilename,
			FileSize = blob.FileSize,
			PageCount = blob.PageCount,
			UploadedAt = blob.UploadedAt,
			UploadedByUser = blob.UploadedByUsername
		}
		).ToList();
	}

	public class GetBlobResponse
	{
		public int Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public string? MimeType { get; set; }
		public bool IsAllocated { get; internal set; }
	}

	public class ListBlobResponse
	{
		public int Id { get; set; }
		public string? FileName { get; set; }
		public long FileSize { get; set; }
		public DateTimeOffset UploadedAt { get; set; }
		public required string UploadedByUser { get; set; }
		public int PageCount { get; set; }
		public string? MimeType { get; set; }
		public bool IsAllocated { get; internal set; }
	}

	public enum DimensionEnum
	{
		Thumbnail = 1,
		Small = 2,
		Full = 3,
	}
}
