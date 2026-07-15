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

	public BlobCommandService(BlobPublicationService blobPublicationService, BlobObjectStore blobObjectStore, IAmbientDataResolver resolver)
	{
		_blobPublicationService = blobPublicationService;
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
			await using var objectStream = await _blobObjectStore.GetWritableObjectStream(blobId, "metadata.json");
			await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerOptions.Web);

			blobs.Add(blobId);
		}

		await _blobPublicationService.PublishBlobsAddedMessage(blobs);
		return blobs;
	}


	public async Task DeleteBlobs(IEnumerable<Guid> blobIds)
	{
		if (blobIds.Count() == 0)
		{
			return;
		}

		foreach (var blobId in blobIds)
		{
			await _blobObjectStore.DeleteObject(blobId);
		}
		await _blobPublicationService.PublishBlobsDeletedMessage(blobIds);
	}
}
