using Backend.DbModel.Database.EntityModels;
using Message = Backend.WebApi.Services.SignalRService.Message;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemService
{
	private readonly SignalRService _signalRService;
	public ArchiveItemService(SignalRService signalRService)
	{
		_signalRService = signalRService;
	}

	
	#region SignalR message creators
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsAddedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("ArchiveItemsAdded", archiveItemIds));
	}

	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsUpdatedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("ArchiveItemsUpdated", archiveItemIds));
	}

	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsDeletedMessage(archiveItems.Select(archiveItem => archiveItem.Id).ToList());
	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<int> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("ArchiveItemsDeleted", archiveItemIds));
	}
	#endregion
}