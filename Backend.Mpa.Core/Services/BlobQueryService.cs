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
	private readonly PreviewGenerator _previewGenerator; 

	public BlobQueryService(BlobObjectStore blobObjectStore, PreviewGenerator previewGenerator)
	{
		_blobObjectStore = blobObjectStore;
		_previewGenerator = previewGenerator;
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
		var blobMetadata = JsonSerializer.Deserialize<BlobModel>(metadataStream, JsonSerializerDefaults.Options) ?? throw new Exception($"Metadata for blob with Id:{blobId} was null after deserialization, this should never happen");

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
		var blobMetadata = JsonSerializer.Deserialize<BlobModel>(metadataStream, JsonSerializerDefaults.Options) ?? throw new Exception($"Metadata for blob with Id:{blobId} was null after deserialization, this should never happen");


		var extension = Path.GetExtension(blobMetadata.OriginalFilename).TrimStart('.');
		if(_previewGenerator.AcceptsMimeType(blobMetadata.MimeType))
		{
			var previewExtension = $"cache-size({maxX},{maxY})-page({pageNo}).png";

			Stream previewStream;
			var existingExtensions = await _blobObjectStore.ListExtensions(blobId);
			if (existingExtensions.Contains(previewExtension))
			{
				previewStream = await _blobObjectStore.GetObject(blobId, previewExtension) ?? throw new Exception($"Preview stream for blob with Id:{blobId} was null, this should never happen");
			}
			else
			{
				var contentStream = await _blobObjectStore.GetObject(blobId, extension) ?? throw new Exception($"Content stream for blob with Id:{blobId} was null, this should never happen");
				var generatedPreview = _previewGenerator.GeneratePreview(contentStream, blobMetadata.MimeType, maxX, maxY, pageNo);
				if (generatedPreview is null)
				{
					// No preview could be generated, so serve the original file. Ownership of contentStream passes to the caller.
					return (contentStream, mimeType: blobMetadata.MimeType, suggestedFilename: blobMetadata.OriginalFilename);
				}

				contentStream.Dispose();
				previewStream = generatedPreview;
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


	public async Task<BlobModel?> GetBlob(Guid blobId)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if (metadataStream == null)
		{
			return null;
		}

		var metadata = JsonSerializer.Deserialize<BlobModel>(metadataStream, JsonSerializerDefaults.Options);
		return metadata;
	}


	/// <summary>
	/// Reads the OCR sidecar for a blob, or <c>null</c> when OCR has never been run on it.
	/// </summary>
	public async Task<BlobOcrModel?> GetBlobOcr(Guid blobId)
	{
		using var ocrStream = await _blobObjectStore.GetObject(blobId, "ocr.json");
		if (ocrStream is null)
		{
			return null;
		}

		return await JsonSerializer.DeserializeAsync<BlobOcrModel>(ocrStream, JsonSerializerDefaults.Options);
	}


	public async Task<ICollection<BlobModel>> GetBlobs(IEnumerable<Guid> blobIds)
	{
		var blobs = new List<BlobModel>();
		foreach (var blobId in blobIds)
		{
			var blobMetadata = await GetBlob(blobId);
			if (blobMetadata != null)
			{
				blobs.Add(blobMetadata);
			}
		}
		return blobs;
	}


	public async Task<IEnumerable<BlobModel>> ListBlobs()
	{
		var blobIds = await _blobObjectStore.ListObjectIds();
		var metadataStreams = (
			await Task.WhenAll(blobIds.Select(async blobId => await _blobObjectStore.GetObject(blobId, "metadata.json")))
		).ToList();
		var blobs = metadataStreams
			.Where(stream => stream != null)
			.Select(stream => JsonSerializer.Deserialize<BlobModel>(stream!, JsonSerializerDefaults.Options))
			.Where(metadata => metadata != null)
			.Select(metadata => metadata!)
			.ToList();

		metadataStreams.ForEach(stream => stream?.Dispose());

		return blobs;
	}
}
