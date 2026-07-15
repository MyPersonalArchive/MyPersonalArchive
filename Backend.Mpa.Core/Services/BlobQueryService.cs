using System.Text.Json;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.Core.Store;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobQueryService
{
	private readonly BlobObjectStore _blobObjectStore;

	public BlobQueryService(BlobObjectStore blobObjectStore, ISignalRService signalRService, IAmbientDataResolver resolver)
	{
		_blobObjectStore = blobObjectStore;
	}


	/// <summary>
	/// Retrieves a blob's content stream and metadata by its ID.
	/// The contentStream must be disposed by the caller after use.
	/// </summary>
	public async Task<(Stream contentStream, BlobMetadata metadata)?> GetBlob(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if(metadataStream == null)
		{
			return null;
		}
		var blobMetadata = JsonSerializer.Deserialize<BlobMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception($"Metadata for blob with Id:{blobId} was null after deserialization, this should never happen");
		var contentStream = await _blobObjectStore.GetObject(blobId, Path.GetExtension(blobMetadata.OriginalFilename).TrimStart('.')) ?? throw new Exception($"Content stream for blob with Id:{blobId} was null, this should never happen");

		return (contentStream, blobMetadata);
	}


	public async Task<BlobMetadata?> GetBlobEntity(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if (metadataStream == null)
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
			if (blobMetadata != null)
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
			await Task.WhenAll(blobIds.Select(async blobId => await _blobObjectStore.GetObject(blobId, "metadata.json")))
		).ToList();
		var blobs = metadataStreams
			.Where(stream => stream != null)
			.Select(stream => JsonSerializer.Deserialize<BlobMetadata>(stream!, JsonSerializerOptions.Web))
			.Where(metadata => metadata != null)
			.Select(metadata => metadata!)
			.ToList();

		metadataStreams.ForEach(stream => stream?.Dispose());

		return blobs;
	}
}
