using System.Text.Json;
using Backend.Core.Cqrs.Infrastructure;
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
	private readonly PreviewGenerator _previewGenerator;
	private readonly IAmbientDataResolver _resolver;


	public BlobCommandService(BlobPublicationService blobPublicationService, BlobObjectStore blobObjectStore, PreviewGenerator previewGenerator, IAmbientDataResolver resolver)
	{
		_blobPublicationService = blobPublicationService;
		_blobObjectStore = blobObjectStore;
		_previewGenerator = previewGenerator;
		_resolver = resolver;
	}


	public async Task<IEnumerable<Guid>> UploadBlobs(IEnumerable<(Stream contentStream, string fileName, string mimeType)> files, IReadOnlyList<BlobOcrUpload?>? ocr = null)
	{
		var fileList = files.ToList();
		var blobs = new List<Guid>();
		for (var index = 0; index < fileList.Count; index++)
		{
			var file = fileList[index];
			var blobId = Guid.NewGuid();
			file.contentStream.Seek(0, SeekOrigin.Begin);
			await _blobObjectStore.StoreObject(blobId, Path.GetExtension(file.fileName).TrimStart('.'), file.contentStream);

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var hash = Convert.ToHexString(file.contentStream.ComputeSha256Hash());

			file.contentStream.Seek(0, SeekOrigin.Begin);
			var typeSpecificMetadata = _previewGenerator.GetFileTypeSpecificMetadata(file.mimeType, file.contentStream);

			var metadata = new BlobModel
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
			await JsonSerializer.SerializeAsync(objectStream, metadata, JsonSerializerDefaults.Options);

			// The OCR result is sent alongside the file, in the same order. The file name is verified so a
			// reordered upload can never attach the text of one file to another.
			var blobOcr = ocr is not null && index < ocr.Count ? ocr[index] : null;
			if (blobOcr is not null && blobOcr.FileName == file.fileName)
			{
				await StoreBlobOcr(metadata, blobOcr);
			}

			blobs.Add(blobId);
		}

		await _blobPublicationService.PublishBlobsAddedMessage(blobs);
		return blobs;
	}


	public const int MaxOcrTextLength = 2_000_000;


	private async Task<bool> StoreBlobOcr(BlobModel blobMetadata, BlobOcrUpload upload)
	{
		if (upload.Text.Length > MaxOcrTextLength)
		{
			return false;
		}

		var ocr = new BlobOcrModel(
			BlobId: blobMetadata.Id,
			SourceFileName: blobMetadata.OriginalFilename,
			MimeType: blobMetadata.MimeType,
			PageCount: upload.Pages.Count,
			Engine: "tesseract.js",
			EngineVersion: upload.EngineVersion,
			Oem: upload.Oem,
			Psm: upload.Psm,
			RotateRadians: upload.RotateRadians,
			Language: upload.Language,
			Text: upload.Text,
			Pages: upload.Pages,
			CreatedAt: DateTimeOffset.Now,
			CreatedBy: _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"));

		await using var ocrStream = await _blobObjectStore.GetWritableObjectStream(blobMetadata.Id, "ocr.json");
		await JsonSerializer.SerializeAsync(ocrStream, ocr, JsonSerializerDefaults.Options);
		return true;
	}


	public async Task SaveBlobOcr(Guid blobId, BlobOcrUpload ocr)
	{
		using var metadataStream = await _blobObjectStore.GetObject(blobId, "metadata.json");
		if (metadataStream is null)
		{
			throw new HttpNotFoundException($"Blob with id {blobId} not found");
		}

		var blobMetadata = await JsonSerializer.DeserializeAsync<BlobModel>(metadataStream, JsonSerializerDefaults.Options)
			?? throw new HttpNotFoundException($"Metadata for blob with id {blobId} was null after deserialization");

		if (!await StoreBlobOcr(blobMetadata, ocr))
		{
			throw new HttpBadRequestException($"OCR text exceeds the maximum length of {MaxOcrTextLength} characters");
		}
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
