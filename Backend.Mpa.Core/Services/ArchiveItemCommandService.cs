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


	public async Task<ArchiveItem?> GetArchiveItem(Guid archiveItemGuid)
	{
		using var archiveItemStream = await _archiveObjectStore.GetObject(archiveItemGuid, "json");
		var archiveItem = JsonSerializer.Deserialize<ArchiveItem>(archiveItemStream, JsonSerializerOptions.Web);

		return await archiveItems.SingleOrDefaultAsync();
	}


	public async Task<IEnumerable<ArchiveItem>> ListArchiveItems()
	{
		var archiveItemGuids = await _archiveObjectStore.ListObjectIds();
		var archiveItemStreams = (
			await Task.WhenAll(archiveItemGuids.Select(async objectId => await _archiveObjectStore.GetObject(objectId, "json")))
		).ToList();
		var archiveItems = archiveItemStreams
			.Select(stream => JsonSerializer.Deserialize<ArchiveItem>(stream, JsonSerializerOptions.Web))
			.Where(item => item != null)
			.Select(item => item!)
			.ToList();

		archiveItemStreams.ForEach(stream => stream.Dispose());

		return archiveItems;
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
			BlobIds = connectedBlobIds,
			CreatedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			CreatedAt = DateTimeOffset.Now,
			LastUpdated = DateTimeOffset.Now
		};

		await _archiveObjectStore.StoreObject(newArchiveItemId, "json", new MemoryStream(JsonSerializer.SerializeToUtf8Bytes(newArchiveItem, JsonSerializerOptions.Web)));

		await PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobService.PublishBlobsUpdatedMessage(connectedBlobIds);

		return newArchiveItem;
	}


	public async Task<ArchiveItem?> UpdateArchiveItem(Guid archiveItemId, string title, IEnumerable<string> tags, JsonObject? metadata, DateTimeOffset? documentDate, IEnumerable<Guid> existingBlobIds, IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var uploadedBlobIds = await _blobService.UploadBlobs(uploadedBlobs);
		var archiveItem = await GetArchiveItem(archiveItemId) ?? throw new Exception($"ArchiveItem with ID {archiveItemId} not found.");

		await _archiveObjectStore.UpdateObjectStream(archiveItemId, "json", stream =>
		{
			var archiveItemBeforeUpdate = JsonSerializer.Deserialize<ArchiveItem>(stream, JsonSerializerOptions.Web) ?? throw new Exception("Failed to deserialize existing ArchiveItem");

			archiveItemBeforeUpdate.Title = title;
			archiveItemBeforeUpdate.Tags = tags;
			archiveItemBeforeUpdate.Metadata = metadata ?? new JsonObject();
			archiveItemBeforeUpdate.DocumentDate = documentDate;
			archiveItemBeforeUpdate.LastUpdated = DateTimeOffset.Now;
			archiveItemBeforeUpdate.BlobIds = new HashSet<Guid>([.. existingBlobIds, .. uploadedBlobIds]);

			stream.SetLength(0); // Clear the stream before writing
			JsonSerializer.Serialize(stream, archiveItemBeforeUpdate, JsonSerializerOptions.Web);
		});

		var addedBlobIds = existingBlobIds.Except(archiveItem.BlobIds);
		foreach (var blobId in addedBlobIds)
		{
			archiveItem.BlobIds.Add(blobId);
		}

		var removedBlobIds = archiveItem.BlobIds.Except(existingBlobIds);
		foreach (var blobId in removedBlobIds)
		{
			archiveItem.BlobIds.Remove(blobId);
		}

		foreach (var blobId in uploadedBlobIds)
		{
			archiveItem.BlobIds.Add(blobId);
		}

		await PublishArchiveItemsUpdatedMessage([archiveItem]);

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