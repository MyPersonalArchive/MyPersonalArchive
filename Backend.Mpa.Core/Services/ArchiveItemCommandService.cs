using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemCommandService
{
	private readonly ArchiveItemQueryService _archiveItemQueryService;
	private readonly ArchiveItemPublicationService _archiveItemPublicationService;
	private readonly ArchiveObjectStore _archiveObjectStore;
	private readonly BlobCommandService _blobCommandService;
	private readonly BlobPublicationService _blobPublicationService;
	private readonly IAmbientDataResolver _resolver;

	public ArchiveItemCommandService(ArchiveItemQueryService archiveItemQueryService,
									 ArchiveItemPublicationService archiveItemPublicationService,
									 ArchiveObjectStore archiveObjectStore,
									 BlobCommandService blobCommandService,
									 BlobPublicationService blobPublicationService,
									 IAmbientDataResolver resolver)
	{
		_archiveItemQueryService = archiveItemQueryService;
		_archiveItemPublicationService = archiveItemPublicationService;
		_archiveObjectStore = archiveObjectStore;
		_blobCommandService = blobCommandService;
		_blobPublicationService = blobPublicationService;
		_resolver = resolver;
	}


	public async Task<ArchiveItemModel> CreateArchiveItem(string title,
													 IEnumerable<string> tags,
													 string? notes,
													 JsonObject? metadata,
													 DateTimeOffset? documentDate,
													 IEnumerable<Guid> existingBlobIds,
													 IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var newBlobIds = await _blobCommandService.UploadBlobs(uploadedBlobs);
		var connectedBlobIds = new HashSet<Guid>([.. existingBlobIds, .. newBlobIds]);

		var newArchiveItemId = Guid.NewGuid();
		var newArchiveItem = new ArchiveItemModel
		{
			Id = newArchiveItemId,
			Title = title,
			Tags = tags,
			Notes = notes,
			DocumentDate = documentDate,
			CreatedAt = DateTimeOffset.Now,
			CreatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			LastUpdatedAt = DateTimeOffset.Now,
			LastUpdatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			Blobs = await _archiveItemQueryService.GetBlobDisplayInfos(connectedBlobIds),
			Metadata = metadata ?? new(),
		};


		using (var stream = new MemoryStream())
		{
			JsonSerializer.Serialize(stream, newArchiveItem, JsonSerializerDefaults.Options);
			await _archiveObjectStore.StoreObject(newArchiveItemId, "json", stream);
		}

		await _archiveItemPublicationService.PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobPublicationService.PublishBlobsUpdatedMessage(connectedBlobIds);

		return newArchiveItem;
	}


	public async Task StoreArchiveItem(Guid archiveItemId,
													   string title,
													   IEnumerable<string> tags,
													   string? notes,
													   JsonObject? metadata,
													   DateTimeOffset? documentDate,
													   IEnumerable<Guid> existingBlobIds,
													   IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var uploadedBlobIds = await _blobCommandService.UploadBlobs(uploadedBlobs);

		var originalArchiveItem = await _archiveItemQueryService.GetArchiveItem(archiveItemId) ?? null;
		var updatedArchiveItem = new ArchiveItemModel
		{
			Id = archiveItemId,
			Title = title,
			Tags = tags,
			Notes = notes,
			DocumentDate = documentDate,
			CreatedAt = originalArchiveItem?.CreatedAt ?? DateTimeOffset.Now,
			CreatedBy = originalArchiveItem?.CreatedBy ?? _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			LastUpdatedAt = DateTimeOffset.Now,
			LastUpdatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			Blobs = await _archiveItemQueryService.GetBlobDisplayInfos(new HashSet<Guid>([.. existingBlobIds, .. uploadedBlobIds])),
			Metadata = metadata ?? []
		};

		using (var stream = new MemoryStream())
		{
			JsonSerializer.Serialize(stream, updatedArchiveItem, JsonSerializerDefaults.Options);
			await _archiveObjectStore.StoreObject(archiveItemId, "json", stream);
		}
	
		await _archiveItemPublicationService.PublishArchiveItemsUpdatedMessage([updatedArchiveItem]);

		var addedBlobIds = existingBlobIds.Except(originalArchiveItem?.Blobs.Select(b => b.Id) ?? []);
		var removedBlobIds = originalArchiveItem?.Blobs.Select(b => b.Id).Except(existingBlobIds) ?? [];
		await _blobPublicationService.PublishBlobsUpdatedMessage([.. addedBlobIds, .. removedBlobIds]);
		await _blobPublicationService.PublishBlobsAddedMessage(uploadedBlobIds);
	}


	public async Task<bool> DeleteArchiveItem(Guid id)
	{
		await _archiveObjectStore.DeleteObject(id);
		await _archiveItemPublicationService.PublishArchiveItemsDeletedMessage([id]);
		return true;
	}
}