using System.Text.Json;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Core.Providers.Store;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Backend.WebApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Backend.WebApi.Controllers;


[ApiController]
[Route("api/[Controller]/[Action]")]
[Authorize(Policy = "TenantIdPolicy")]
public class BlobController : ControllerBase
{
	private readonly MpaDbContext _dbContext;
	private IFileStorageProvider _fileProvider;
	private readonly IAmbientDataResolver _resolver;
	private readonly BlobService _blobService;
	private readonly IObjectStore _objectStore;
	private readonly string _baseFolder;

	public BlobController(IOptions<AppConfig> config, MpaDbContext dbContext, IFileStorageProvider fileProvider, IAmbientDataResolver resolver, BlobService blobService, IObjectStore objectStore)
	{
		_dbContext = dbContext;
		_fileProvider = fileProvider;
		_resolver = resolver;
		_blobService = blobService;
		_objectStore = objectStore;

		var currentTenantId = resolver.GetCurrentTenantId() ?? throw new Exception("Missing tenant ID");
		_baseFolder = Path.Combine(config.Value.RootFolder, "Blobs", currentTenantId.ToString());
	}


	//If we decide to go away from libvips we will remove "Preview" and only have this
	public async Task<ActionResult> GetFile([FromQuery] int blobId, [FromQuery] DimensionEnum dimension)
	{
		var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
		if (blob == null)
		{
			return NotFound();
		}

		var filename = blob.PathInStore.Split('/').Last();
		var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(filename));

		var metadataStream = await _objectStore.GetObject(objectId, "metadata");
		var metadata = JsonSerializer.Deserialize<FileMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize metadata");
		var contentStream = await _objectStore.GetObject(objectId, Path.GetExtension(filename).TrimStart('.'));

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

			var previewStream = PreviewGenerator.GeneratePreview(contentStream, metadata.MimeType, maxX, maxY, 0);
			return File(previewStream, "image/png", $"{metadata.OriginalFilename}_preview(0).png");
		}

		return File(contentStream, metadata.MimeType, metadata.OriginalFilename);
	}


	[HttpPost]
	public async Task<ActionResult> Upload(IFormFileCollection files)
	{
		var blobs = new List<Blob>();
		foreach (var file in files)
		{
			var objectId = Guid.NewGuid();
			var stream = file.OpenReadStream();
			await _objectStore.StoreObject(objectId, Path.GetExtension(file.FileName).TrimStart('.'), stream);

			var metadata = new FileMetadata
			{
				MimeType = file.ContentType,
				Size = file.Length,
				OriginalFilename = file.FileName,
				Hash = Convert.ToHexString(stream.ComputeSha256Hash()),
				UploadedAt = DateTimeOffset.Now,
				UploadedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim")
			};

			await using (var objectStream = await _objectStore.GetWritableObjectStream(objectId, "metadata"))
			{
				await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerOptions.Web);
			}

			var blob = new Blob
			{
				TenantId = _resolver.GetCurrentTenantId()!.Value,
				ArchiveItem = null,
				FileHash = stream.ComputeSha256Hash(),
				MimeType = file.ContentType,
				OriginalFilename = file.FileName,
				PageCount = PreviewGenerator.GetDocumentPageCount(file.ContentType, stream),
				FileSize = file.Length,
				UploadedAt = DateTimeOffset.Now,
				UploadedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
				StoreRoot = StoreRoot.FileStorage.ToString(),

				// `pathInStore` is not necessarily the actual path where the file is stored, but we keep it for backward
				// compatibility with existing data in the database. The objectId can be extracted from the filename.
				// The actual storage is handled by the IObjectStore implementation, which can have its own internal structure.
				PathInStore = Path.Combine(GetFolderPath(objectId), $"{objectId:D}{Path.GetExtension(file.FileName)}")
			};
			blobs.Add(blob);
		}

		await _dbContext.Blobs.AddRangeAsync(blobs);
		await _dbContext.SaveChangesAsync();

		await _blobService.PublishBlobsAddedMessage(blobs);

		return NoContent();
	}

	private string GetFolderPath(Guid objectId)
	{
		var objectIdStringDashed = objectId.ToString("D");
		return Path.Combine(_baseFolder, objectIdStringDashed[..2], objectIdStringDashed[..4], objectIdStringDashed[..6]);
	}

	public enum DimensionEnum
	{
		Thumbnail = 1,
		Small = 2,
		Full = 3,
	}
}
