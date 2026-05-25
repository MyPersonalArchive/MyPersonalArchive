using System.Text.Json.Nodes;
using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemService
{
	private readonly ISignalRService _signalRService;
	private readonly MpaDbContext _dbContext;
	private readonly BlobService _blobService;
	private readonly IAmbientDataResolver _resolver;

	public ArchiveItemService(ISignalRService signalRService, MpaDbContext dbContext, BlobService blobService, IAmbientDataResolver resolver)
	{
		_signalRService = signalRService;
		_dbContext = dbContext;
		_blobService = blobService;
		_resolver = resolver;
	}


	public async Task<ArchiveItem?> GetArchiveItem(int id)
	{
		var archiveItem = await _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Blobs)
			.Include(archiveItem => archiveItem.Tags)
			.SingleOrDefaultAsync(x => x.Id == id);

		return archiveItem;
	}


	public async Task<IEnumerable<ArchiveItem>> ListArchiveItems(string? titleFilter = null, IEnumerable<string>? tagsFilter = null, IEnumerable<string>? metadataTypesFilter = null)
	{
		var archiveItems = _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Tags)
			.Include(archiveItem => archiveItem.Blobs)
			.ConditionalWhere(!string.IsNullOrEmpty(titleFilter), archiveItem => archiveItem.Title!.ToLower().Contains(titleFilter!, StringComparison.InvariantCultureIgnoreCase))
			.ToList()
			.ConditionalWhere(tagsFilter != null && tagsFilter!.Any(), archiveItem => tagsFilter!.All(tag => archiveItem.Tags.Any(t => t.Title == tag)))
			.ConditionalWhere(metadataTypesFilter != null && metadataTypesFilter!.Any(), archiveItem => metadataTypesFilter!.All(metadataType => archiveItem.Metadata.ContainsKey(metadataType.ToLower())))
			.ToList();
		return archiveItems;
	}


	public async Task<ArchiveItem> CreateArchiveItem(string title, IEnumerable<string> tags, JsonObject? metadata, IEnumerable<int> blobsIds, IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var existingBlobEntities = await _blobService.GetBlobEntities(blobsIds);

		var newBlobEntities = await _blobService.UploadBlobs(uploadedBlobs);

		ICollection<Blob> connectedBlobEntities = [.. existingBlobEntities, .. newBlobEntities];

		var newArchiveItem = new ArchiveItem
		{
			Title = title,
			CreatedByUsername = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim"),
			CreatedAt = DateTimeOffset.Now,
			Blobs = connectedBlobEntities,
			Tags = tags != null
				? tags.Select(tag => new Tag { Title = tag }).ToList()
				: [],
			Metadata = metadata ?? new JsonObject(),
			LastUpdated = DateTimeOffset.Now
		};

		_dbContext.ArchiveItems.Add(newArchiveItem);
		await _dbContext.SaveChangesAsync();

		await PublishArchiveItemsAddedMessage([newArchiveItem]);
		await _blobService.PublishBlobsUpdatedMessage(connectedBlobEntities);

		return newArchiveItem;
	}


	public async Task<ArchiveItem?> UpdateArchiveItem(int archiveItemId, string title, IEnumerable<string> tags, JsonObject? metadata, DateTimeOffset? documentDate, IEnumerable<int> blobsIds, IEnumerable<(Stream stream, string fileName, string contentType)> uploadedBlobs)
	{
		var archiveItem = await _dbContext.ArchiveItems
			.Include(item => item.Blobs)
			.Include(item => item.Tags)
			.SingleOrDefaultAsync(item => item.Id == archiveItemId);

		if (archiveItem == null)
		{
			return null;
		}

		var addedBlobIds = blobsIds.Except(archiveItem.Blobs!.Select(blob => blob.Id));
		foreach(var blobEntity in await _blobService.GetBlobEntities(addedBlobIds))
		{
			archiveItem.Blobs!.Add(blobEntity);
		}

		var removedBlobIds = archiveItem.Blobs!.Select(blob => blob.Id).Except(blobsIds);
		foreach (var blobId in removedBlobIds)
		{
			var blobEntity = archiveItem.Blobs!.Single(blob => blob.Id == blobId);
			archiveItem.Blobs!.Remove(blobEntity);
		}

		var uploadedBlobEntities = await _blobService.UploadBlobs(uploadedBlobs);
		foreach (var blobEntity in uploadedBlobEntities)
		{
			archiveItem.Blobs!.Add(blobEntity);
		}

		archiveItem.Title = title;
		archiveItem.Tags = tags != null
			? tags.Select(tag => new Tag { Title = tag }).ToList()
			: [];
		archiveItem.Metadata = metadata ?? new JsonObject();
		archiveItem.DocumentDate = documentDate;
		archiveItem.LastUpdated = DateTimeOffset.Now;


		await _dbContext.SaveChangesAsync();

		await PublishArchiveItemsUpdatedMessage([archiveItem]);

		await _blobService.PublishBlobsUpdatedMessage([.. addedBlobIds, .. removedBlobIds]);
		await _blobService.PublishBlobsAddedMessage(uploadedBlobEntities);

		return archiveItem;
	}


	public async Task<bool> DeleteArchiveItem(int id)
	{
		var archiveItem = await _dbContext.ArchiveItems
			.Include(archiveItem => archiveItem.Blobs)
			.Include(archiveItem => archiveItem.Tags)
				.ThenInclude(tag => tag.ArchiveItems)
			.SingleOrDefaultAsync(x => x.Id == id);

		if (archiveItem == null)
		{
			return false;
		}

		if (archiveItem.Blobs != null)
		{
			var blobIds = archiveItem.Blobs.Select(blob => blob.Id);
			await _blobService.DeleteBlobs(blobIds);
			_dbContext.Blobs.RemoveRange(archiveItem.Blobs);
		}

		var removedTags = archiveItem.Tags.Where(tag => tag.ArchiveItems != null && tag.ArchiveItems.Count == 1 && tag.ArchiveItems.Contains(archiveItem));
		foreach (var tag in removedTags)
		{
			_dbContext.Tags.Remove(tag);
		}

		_dbContext.ArchiveItems.Remove(archiveItem);
		await _dbContext.SaveChangesAsync();

		await PublishArchiveItemsDeletedMessage([archiveItem]);

		return true;
	}


	#region SignalR message creators
	private async Task PublishArchiveItemsAddedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsAddedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	private async Task PublishArchiveItemsAddedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsAdded", archiveItemIds));
	}


	private async Task PublishArchiveItemsUpdatedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsUpdatedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	private async Task PublishArchiveItemsUpdatedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsUpdated", archiveItemIds));
	}


	private async Task PublishArchiveItemsDeletedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsDeletedMessage(archiveItems.Select(archiveItem => archiveItem.Id).ToList());
	private async Task PublishArchiveItemsDeletedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsDeleted", archiveItemIds));
	}
	#endregion
}