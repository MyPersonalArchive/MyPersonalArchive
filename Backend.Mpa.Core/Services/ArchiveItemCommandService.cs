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
													 JsonObject? metadata,
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
			DocumentDate = null,
			CreatedAt = DateTimeOffset.Now,
			CreatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			LastUpdatedAt = DateTimeOffset.Now,
			LastUpdatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			Blobs = await _archiveItemQueryService.GetBlobDisplayInfos(connectedBlobIds),
			Metadata = metadata ?? new(),
		};

		using (var stream = new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(newArchiveItem, JsonSerializerOptions.Web)))
		{
			await _archiveObjectStore.StoreObject(newArchiveItemId, "json", stream);
		}

		await _archiveItemPublicationService.PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobPublicationService.PublishBlobsUpdatedMessage(connectedBlobIds);

		return newArchiveItem;
	}


	public async Task<ArchiveItemModel?> UpdateArchiveItem(Guid archiveItemId,
													  string title,
													  IEnumerable<string> tags,
													  JsonObject? metadata,
													  DateTimeOffset? documentDate,
													  IEnumerable<Guid> existingBlobIds,
													  IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var uploadedBlobIds = await _blobCommandService.UploadBlobs(uploadedBlobs);
		var archiveItem = await _archiveItemQueryService.GetArchiveItem(archiveItemId) ?? throw new Exception($"ArchiveItem with ID {archiveItemId} not found.");

		await _archiveObjectStore.UpdateObjectStream(archiveItemId, "json", async archiveItemStream =>
		{
			var archiveItemToUpdate = JsonSerializer.Deserialize<ArchiveItemModel>(archiveItemStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize existing ArchiveItem");

			archiveItemToUpdate.Title = title;
			archiveItemToUpdate.Tags = tags;
			archiveItemToUpdate.DocumentDate = documentDate;
			archiveItemToUpdate.LastUpdatedAt = DateTimeOffset.Now;
			archiveItemToUpdate.LastUpdatedBy = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim");
			archiveItemToUpdate.Blobs = await _archiveItemQueryService.GetBlobDisplayInfos(new HashSet<Guid>([.. existingBlobIds, .. uploadedBlobIds]));
			// archiveItemToUpdate.Metadata = metadata ?? new JsonObject();

			archiveItemStream.SetLength(0); // Clear the stream before writing
			JsonSerializer.Serialize(archiveItemStream, archiveItemToUpdate, JsonSerializerOptions.Web);
		});

		await _archiveItemPublicationService.PublishArchiveItemsUpdatedMessage([archiveItem]);

		var addedBlobIds = existingBlobIds.Except(archiveItem.Blobs.Select(b => b.Id));

		var removedBlobIds = archiveItem.Blobs.Select(b => b.Id).Except(existingBlobIds);
		await _blobPublicationService.PublishBlobsUpdatedMessage([.. addedBlobIds, .. removedBlobIds]);
		await _blobPublicationService.PublishBlobsAddedMessage(uploadedBlobIds);

		return archiveItem;
	}


	public async Task<bool> DeleteArchiveItem(Guid id)
	{
		await _archiveObjectStore.DeleteObject(id);
		await _archiveItemPublicationService.PublishArchiveItemsDeletedMessage([id]);
		return true;
	}
}