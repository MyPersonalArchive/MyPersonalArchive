using System.Text.Json;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.Core.Store;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobCommandService
{
	private readonly BlobPublicationService _blobPublicationService;
	private readonly BlobObjectStore _blobObjectStore;
	private readonly IAmbientDataResolver _resolver;

	public BlobService(ISignalRService signalRService, BlobObjectStore blobObjectStore, IAmbientDataResolver resolver)
	{
		_blobPublicationService = new BlobPublicationService(signalRService);
		_blobObjectStore = blobObjectStore;
		_resolver = resolver;
	}


	public async Task<IEnumerable<Guid>> UploadBlobs(IEnumerable<(Stream contentStream, string fileName, string mimeType)> files)
	{
		var blobs = new List<Guid>();
		foreach (var file in files)
		{
			var blobId = Guid.NewGuid();
			file.contentStream.Seek(0, SeekOrigin.Begin);
			await _blobObjectStore.StoreObject(blobId, Path.GetExtension(file.fileName).TrimStart('.'), file.contentStream);

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var hash = Convert.ToHexString(file.contentStream.ComputeSha256Hash());

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var typeSpecificMetadata = PreviewGenerator.GetFileTypeSpecificMetadata(file.mimeType, file.contentStream);

			var metadata = new BlobMetadata
			{
				Id = blobId,
				OriginalFilename = file.fileName,
				MimeType = file.mimeType,
				Size = file.contentStream.Length,
				Hash = hash,
				TypeSpecificMetadata = typeSpecificMetadata,
				UploadedAt = DateTimeOffset.Now,
				UploadedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			};
			await using var objectStream = await _blobObjectStore.GetWritableObjectStream(blobId, "metadata");
			await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerOptions.Web);

			blobs.Add(blobId);
		}

		await PublishBlobsAddedMessage(blobs);
		return blobs;
	}


	/// <summary>
	/// Retrieves a blob's content stream and metadata by its ID.
	/// The contentStream must be disposed by the caller after use.
	/// </summary>
	public async Task<(Stream contentStream, BlobMetadata metadata)?> GetBlob(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata");
		if (metadataStream is null)
		{
			return null;
		}
		var blobMetadata = JsonSerializer.Deserialize<BlobMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize metadata");

		var contentStream = await _blobObjectStore.GetObject(blobId, Path.GetExtension(blobMetadata.OriginalFilename).TrimStart('.'));
		if (contentStream is null)
		{
			return null;
		}
		return (contentStream, blobMetadata);
	}


	public async Task<BlobMetadata?> GetBlobEntity(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata");
		if (metadataStream is null)
		{
			return null;
		}

		var metadata = JsonSerializer.Deserialize<BlobMetadata>(metadataStream, JsonSerializerOptions.Web);
		return metadata;
	}


	public async Task<ICollection<BlobMetadata>> GetBlobEntities(IEnumerable<Guid> blobIds)
	{
		var blobs = new List<BlobMetadata>();
		foreach (var blobId in blobIds)
		{
			var blobMetadata = await GetBlobEntity(blobId);
			if (blobMetadata is not null)
			{
				blobs.Add(blobMetadata);
			}
		}
		return blobs;
	}


	public async Task<IEnumerable<BlobMetadata>> ListBlobEntities()
	{
		var blobIds = await _blobObjectStore.ListObjectIds();
		var metadataStreams = (
			await Task.WhenAll(blobIds.Select(async blobId => await _blobObjectStore.GetObject(blobId, "metadata")))
		).ToList();
		var blobs = metadataStreams
			.Where(stream => stream is not null)
			.Select(stream => stream!)
			.Select(stream => JsonSerializer.Deserialize<BlobMetadata>(stream, JsonSerializerOptions.Web))
			.Where(metadata => metadata != null)
			.Select(metadata => metadata!)
			.ToList();

		metadataStreams.ForEach(stream => stream?.Dispose());

		return blobs;
	}


	public async Task DeleteBlobs(IEnumerable<Guid> blobIds)
	{
		foreach (var blobId in blobIds)
		{
			await _blobObjectStore.DeleteObject(blobId);
		}
	}


	#region SignalR message creators
	internal async Task PublishBlobsAddedMessage(IEnumerable<BlobMetadata> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	internal async Task PublishBlobsAddedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsAdded", blobIds));
	}


	internal async Task PublishBlobsUpdatedMessage(IEnumerable<BlobMetadata> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	internal async Task PublishBlobsUpdatedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsUpdated", blobIds));
	}


	internal async Task PublishBlobsDeletedMessage(IEnumerable<BlobMetadata> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id));
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
