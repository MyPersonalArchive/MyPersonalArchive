using System.Text.Json;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobService
{
	private readonly ISignalRService _signalRService;
	private readonly IObjectStore _objectStore;
	private readonly MpaDbContext _dbContext;
	private readonly IAmbientDataResolver _resolver;
	private string _baseFolder;

	public BlobService(IOptions<AppConfig> config, ISignalRService signalRService, IObjectStore objectStore, MpaDbContext dbContext, IAmbientDataResolver resolver)
	{
		_signalRService = signalRService;
		_objectStore = objectStore;
		_dbContext = dbContext;
		_resolver = resolver;

		var currentTenantId = resolver.GetCurrentTenantId() ?? throw new Exception("Missing tenant ID");
		_baseFolder = Path.Combine(config.Value.RootFolder, "Blobs", currentTenantId.ToString());
	}


	public async Task<(Stream contentStream, FileMetadata metadata, Blob blob)?> GetBlob(Guid blobId)
	{
		var blob = await _dbContext.Blobs.SingleOrDefaultAsync(blob => blob.Id == blobId);
		if (blob == null)
		{
			return null; //(null, null, null);
		}

		var filename = blob.PathInStore.Split('/').Last();
		var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(filename));

		var metadataStream = await _objectStore.GetObject(objectId, "metadata");
		var metadata = JsonSerializer.Deserialize<FileMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize metadata");
		var contentStream = await _objectStore.GetObject(objectId, Path.GetExtension(filename).TrimStart('.'));

		return (contentStream, metadata, blob);
	}
	

	public async Task<IEnumerable<Blob>> UploadBlobs(IEnumerable<(Stream contentStream, string fileName, string mimeType)> files)
	{
		var blobs = new List<Blob>();
		foreach (var file in files)
		{
			var objectId = Guid.NewGuid();
			var stream = file.contentStream;
			await _objectStore.StoreObject(objectId, Path.GetExtension(file.fileName).TrimStart('.'), stream);

			var metadata = new FileMetadata
			{
				MimeType = file.mimeType,
				Size = file.contentStream.Length,
				OriginalFilename = file.fileName,
				Hash = Convert.ToHexString(stream.ComputeSha256Hash()),
				UploadedAt = DateTimeOffset.Now,
				UploadedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim")
			};

			await using (var objectStream = await _objectStore.GetWritableObjectStream(objectId, "metadata"))
			{
				await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerOptions.Web);
			}

			int currentTenantId = _resolver.GetCurrentTenantId() ?? throw new Exception("Missing tenant ID");
			string currentUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim");
			var blob = new Blob
			{
				TenantId = currentTenantId,
				ArchiveItem = null,
				MimeType = file.mimeType,
				OriginalFilename = file.fileName,
				PageCount = PreviewGenerator.GetDocumentPageCount(file.mimeType, stream),
				FileSize = file.contentStream.Length,
				UploadedAt = DateTimeOffset.Now,
				UploadedByUsername = currentUsername,

				// `pathInStore` is not necessarily the actual path where the file is stored, but we keep it for backward
				// compatibility with existing data in the database. The objectId can be extracted from the filename.
				// The actual storage is handled by the IObjectStore implementation, which can have its own internal structure.
				Id = objectId,
				PathInStore = Path.Combine(GetFolderPath(objectId), $"{objectId:D}{Path.GetExtension(file.fileName)}")
			};
			blobs.Add(blob);
		}

		await _dbContext.Blobs.AddRangeAsync(blobs);
		await _dbContext.SaveChangesAsync();

		await PublishBlobsAddedMessage(blobs);
		return blobs;
	}


	// TODO: This is a duplicate function. Look for others with same signature and code and remove when no longer relevant.
	private string GetFolderPath(Guid objectId)
	{
		var objectIdStringDashed = objectId.ToString("D");
		return Path.Combine(_baseFolder, objectIdStringDashed[..2], objectIdStringDashed[..4], objectIdStringDashed[..6]);
	}



	public async Task DeleteBlobs(IEnumerable<Guid> blobIds)
	{
		var blobs = await _dbContext.Blobs.Where(x => blobIds.Contains(x.Id)).ToListAsync();
		if (blobs.Count == 0)
		{
			return;
		}

		foreach (var blob in blobs)
		{
			var filename = blob.PathInStore.Split('/').Last();
			var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(filename));

			await _objectStore.DeleteObject(objectId);
		}

		_dbContext.Blobs.RemoveRange(blobs);
		await _dbContext.SaveChangesAsync();

		await PublishBlobsDeletedMessage(blobs);
	}


	public async Task<Blob?> GetBlobEntity(Guid blobId)
	{
		var blob = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.SingleOrDefaultAsync(blob => blob.Id == blobId);
		return blob;
	}


	public async Task<ICollection<Blob>> GetBlobEntities(IEnumerable<Guid> blobIds)
	{
		var blobs = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.Where(blob => blobIds.Contains(blob.Id))
			.ToListAsync();
			
		return blobs;
	}


	public async Task<IEnumerable<Blob>> ListBlobEntities()
	{
		var blobs = await _dbContext.Blobs
			.Include(blob => blob.UploadedBy)
			.Include(blob => blob.ArchiveItem)
			.ToListAsync();

		return blobs;
	}


	#region SignalR message creators
	internal async Task PublishBlobsAddedMessage(IEnumerable<Blob> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	private async Task PublishBlobsAddedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsAdded", blobIds));
	}


	internal async Task PublishBlobsUpdatedMessage(IEnumerable<Blob> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	internal async Task PublishBlobsUpdatedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsUpdated", blobIds));
	}


	private async Task PublishBlobsDeletedMessage(IEnumerable<Blob> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id).ToList());
	private async Task PublishBlobsDeletedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsDeleted", blobIds));
	}
	#endregion
}
