using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Core.Services;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemService
{
	private readonly ISignalRService _signalRService;
	private readonly MpaDbContext _dbContext;
	private readonly IObjectStore _objectStore;

	public ArchiveItemService(ISignalRService signalRService, MpaDbContext dbContext, IObjectStore objectStore)
	{
		_signalRService = signalRService;
		_dbContext = dbContext;
		_objectStore = objectStore;
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
			.ConditionalWhere(tagsFilter != null && tagsFilter!.Any(), archiveItem => tagsFilter.All(tag => archiveItem.Tags.Any(t => t.Title == tag)))
			.ConditionalWhere(metadataTypesFilter != null && metadataTypesFilter!.Any(), archiveItem => metadataTypesFilter.All(metadataType => archiveItem.Metadata.ContainsKey(metadataType.ToLower())))
			.ToList();
		return archiveItems;
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
			foreach (var blob in archiveItem.Blobs)
			{
				var objectId = Guid.Parse(Path.GetFileNameWithoutExtension(blob.PathInStore));
				await _objectStore.DeleteObject(objectId);
				_dbContext.Blobs.Remove(blob);
			}
		}

		var removedTags = archiveItem.Tags.Where(tag => tag.ArchiveItems != null && tag.ArchiveItems.Count == 1 && tag.ArchiveItems.Contains(archiveItem));
		foreach (var tag in removedTags)
		{
			_dbContext.Tags.Remove(tag);
		}

		_dbContext.ArchiveItems.Remove(archiveItem);
		await _dbContext.SaveChangesAsync();

		await PublishArchiveItemsDeletedMessage(new[] { archiveItem });
		
		return true;
	}


	#region SignalR message creators
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsAddedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsAdded", archiveItemIds));
	}

	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsUpdatedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsUpdated", archiveItemIds));
	}

	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsDeletedMessage(archiveItems.Select(archiveItem => archiveItem.Id).ToList());
	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsDeleted", archiveItemIds));
	}
	#endregion
}