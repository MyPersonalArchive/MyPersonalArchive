using System.Text.Json;
using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Mpa.Core.Cqrs;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Net.Http.Headers;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemCommandService
{
	private readonly ISignalRService _signalRService;
	private readonly ArchiveObjectStore _archiveObjectStore;
	private readonly BlobService _blobService;
	private readonly IAmbientDataResolver _resolver;

	public ArchiveItemService(ISignalRService signalRService, ArchiveObjectStore archiveObjectStore, BlobService blobService, IAmbientDataResolver resolver)
	{
		_signalRService = signalRService;
		_archiveObjectStore = archiveObjectStore;
		_blobService = blobService;
		_resolver = resolver;
	}


	public async Task<ArchiveItem> CreateArchiveItem(string title, IEnumerable<string> tags, JsonObject? metadata, IEnumerable<Guid> existingBlobIds, IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var newBlobEntities = await _blobService.UploadBlobs(uploadedBlobs);
		var connectedBlobIds = new HashSet<Guid>([.. existingBlobIds, .. newBlobEntities]);

		var newArchiveItemId = Guid.NewGuid();
		var newArchiveItem = new ArchiveItem
		{
			Id = newArchiveItemId,
			Title = title,
			Tags = tags,
			Metadata = metadata ?? new(),
			DocumentDate = null,
			BlobDisplayInfos = await GetBlobDisplayInfos(connectedBlobIds),
			CreatedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			CreatedAt = DateTimeOffset.Now,
			LastUpdated = DateTimeOffset.Now
		};

		await _archiveObjectStore.StoreObject(newArchiveItemId, "json", new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(newArchiveItem, JsonSerializerOptions.Web)));

		await PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobService.PublishBlobsUpdatedMessage(connectedBlobIds);

		return newArchiveItem;
	}


	public async Task<ArchiveItem?> GetArchiveItem(Guid archiveItemGuid)
	{
		using var archiveItemStream = await _archiveObjectStore.GetObject(archiveItemGuid, "json");
		if (archiveItemStream == null)
		{
			return null;
		}
		var archiveItem = JsonSerializer.Deserialize<ArchiveItem>(archiveItemStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize ArchiveItem");

		return await archiveItems.SingleOrDefaultAsync();
	}


	public async Task<IEnumerable<ArchiveItem>> ListArchiveItems()
	{
		var archiveItemGuids = await _archiveObjectStore.ListObjectIds();
		var archiveItemStreams = (
			await Task.WhenAll(archiveItemGuids.Select(async objectId => await _archiveObjectStore.GetObject(objectId, "json")))
		).ToList();
		var archiveItems = archiveItemStreams
			.Where(stream => stream != null)
			.Select(stream => stream!)
			.Select(stream => JsonSerializer.Deserialize<ArchiveItem>(stream, JsonSerializerOptions.Web))
			.Where(item => item != null)
			.Select(item => item!)
			.ToList();

		archiveItemStreams.ForEach(stream => stream?.Dispose());

		return archiveItems;
	}


	private async Task<IEnumerable<ArchiveItem.BlobDisplayInfo>> GetBlobDisplayInfos(IEnumerable<Guid> connectedBlobIds)
	{
		var blobEntities = await _blobService.GetBlobEntities(connectedBlobIds);
		return blobEntities
			.Where(blobEntity => blobEntity != null)
			.Select(blobEntity => new ArchiveItem.BlobDisplayInfo
			{
				Id = blobEntity!.Id,
				MimeType = blobEntity.MimeType,
				NumberOfPages = blobEntity.TypeSpecificMetadata is PdfMetadata pdfMetadata ? pdfMetadata.PageCount : 0
			});
	}


	public async Task<ArchiveItem?> UpdateArchiveItem(Guid archiveItemId, string title, IEnumerable<string> tags, JsonObject? metadata, DateTimeOffset? documentDate, IEnumerable<Guid> existingBlobIds, IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var uploadedBlobIds = await _blobService.UploadBlobs(uploadedBlobs);
		var archiveItem = await GetArchiveItem(archiveItemId) ?? throw new Exception($"ArchiveItem with ID {archiveItemId} not found.");

		await _archiveObjectStore.UpdateObjectStream(archiveItemId, "json", async archiveItemStream =>
		{
			var archiveItemToUpdate = JsonSerializer.Deserialize<ArchiveItem>(archiveItemStream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize existing ArchiveItem");

			archiveItemToUpdate.Title = title;
			archiveItemToUpdate.Tags = tags;
			archiveItemToUpdate.DocumentDate = documentDate;
			archiveItemToUpdate.LastUpdated = DateTimeOffset.Now;
			archiveItemToUpdate.BlobDisplayInfos = await GetBlobDisplayInfos(new HashSet<Guid>([.. existingBlobIds, .. uploadedBlobIds]));
			archiveItemToUpdate.Metadata = metadata ?? new JsonObject();

			archiveItemStream.SetLength(0); // Clear the stream before writing
			JsonSerializer.Serialize(archiveItemStream, archiveItemToUpdate, JsonSerializerOptions.Web);
		});

		await PublishArchiveItemsUpdatedMessage([archiveItem]);

		var addedBlobIds = existingBlobIds.Except(archiveItem.BlobDisplayInfos.Select(b => b.Id));

		var removedBlobIds = archiveItem.BlobDisplayInfos.Select(b => b.Id).Except(existingBlobIds);
		await _blobService.PublishBlobsUpdatedMessage([.. addedBlobIds, .. removedBlobIds]);
		await _blobService.PublishBlobsAddedMessage(uploadedBlobIds);

		return archiveItem;
	}


	public async Task<bool> DeleteArchiveItem(Guid archiveItemId)
	{
		await _archiveObjectStore.DeleteObject(archiveItemId);
		await PublishArchiveItemsDeletedMessage([archiveItemId]);
		return true;
	}


	#region SignalR message creators
	private async Task PublishArchiveItemsAddedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsAddedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	private async Task PublishArchiveItemsAddedMessage(IEnumerable<Guid> archiveItemGuids)
	{
		if (archiveItemGuids == null || !archiveItemGuids.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsAdded", archiveItemGuids));
	}


	private async Task PublishArchiveItemsUpdatedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsUpdatedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	private async Task PublishArchiveItemsUpdatedMessage(IEnumerable<Guid> archiveItemGuids)
	{
		if (archiveItemGuids == null || !archiveItemGuids.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsUpdated", archiveItemGuids));
	}


	private async Task PublishArchiveItemsDeletedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsDeletedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	private async Task PublishArchiveItemsDeletedMessage(IEnumerable<Guid> archiveItemGuids)
	{
		if (archiveItemGuids == null || !archiveItemGuids.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsDeleted", archiveItemGuids));
	}
	#endregion
}