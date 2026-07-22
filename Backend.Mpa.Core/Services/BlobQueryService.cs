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

	public BlobQueryService(BlobObjectStore blobObjectStore)
	{
		_blobObjectStore = blobObjectStore;
	}


	/// <summary>
	/// Retrieves a blob's content stream and metadata by its ID.
	/// The contentStream must be disposed by the caller after use.
	/// </summary>
	public async Task<(Stream contentStream, string mimeType, string suggestedFilename)?> GetBlobOriginal(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if (metadataStream == null)
		{
			return null;
		}
		var blobMetadata = JsonSerializer.Deserialize<BlobMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception($"Metadata for blob with Id:{blobId} was null after deserialization, this should never happen");

		string extension = Path.GetExtension(blobMetadata.OriginalFilename).TrimStart('.');
		var contentStream = await _blobObjectStore.GetObject(blobId, extension) ?? throw new Exception($"Content stream for blob with Id:{blobId} was null, this should never happen");

		return (contentStream, mimeType: blobMetadata.MimeType, suggestedFilename: blobMetadata.OriginalFilename);
	}


	public async Task<(Stream contentStream, string mimeType, string suggestedFilename)?> GetBlobPreview(Guid blobId, int maxX, int maxY, int pageNo = 0, bool storePreview = true)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if (metadataStream == null)
		{
			return null;
		}
		var blobMetadata = JsonSerializer.Deserialize<BlobMetadata>(metadataStream, JsonSerializerOptions.Web) ?? throw new Exception($"Metadata for blob with Id:{blobId} was null after deserialization, this should never happen");


		var extension = Path.GetExtension(blobMetadata.OriginalFilename).TrimStart('.');
		if(PreviewGenerator.AcceptsMimeType(blobMetadata.MimeType))
		{
			var previewExtension = $"size({maxX},{maxY}).page({pageNo}).png";

			Stream previewStream;
			var existingExtensions = await _blobObjectStore.ListExtensions(blobId);
			if (existingExtensions.Contains(previewExtension))
			{
				previewStream = await _blobObjectStore.GetObject(blobId, previewExtension) ?? throw new Exception($"Preview stream for blob with Id:{blobId} was null, this should never happen");
			}
			else
			{
				using var contentStream = await _blobObjectStore.GetObject(blobId, extension) ?? throw new Exception($"Content stream for blob with Id:{blobId} was null, this should never happen");
				previewStream = PreviewGenerator.GeneratePreview(contentStream, blobMetadata.MimeType, maxX, maxY, pageNo);
				if (storePreview)
				{
					await _blobObjectStore.StoreObject(blobId, previewExtension, previewStream);
					previewStream.Position = 0; // Reset the position after storing
				}
			}
			return (previewStream, mimeType: "image/png", suggestedFilename: $"{blobMetadata.OriginalFilename}.size({maxX},{maxY}).page({pageNo}).png");
		}
		else
		{
			var contentStream = await _blobObjectStore.GetObject(blobId, extension) ?? throw new Exception($"Content stream for blob with Id:{blobId} was null, this should never happen");
			return (contentStream, mimeType: blobMetadata.MimeType, suggestedFilename: blobMetadata.OriginalFilename);
		}
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
