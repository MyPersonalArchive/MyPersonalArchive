using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.Mpa.Core.Store;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveItemPublicationService
{
	private readonly ISignalRService _signalRService;

	public ArchiveItemPublicationService(ISignalRService signalRService)
	{
		_signalRService = signalRService;
	}


	#region SignalR message creators
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsAddedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsAddedMessage(IEnumerable<Guid> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsAdded", archiveItemIds));
	}


	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsUpdatedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsUpdatedMessage(IEnumerable<Guid> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsUpdated", archiveItemIds));
	}


	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<ArchiveItem> archiveItems) => await PublishArchiveItemsDeletedMessage(archiveItems.Select(archiveItem => archiveItem.Id));
	public async Task PublishArchiveItemsDeletedMessage(IEnumerable<Guid> archiveItemIds)
	{
		if(archiveItemIds == null || !archiveItemIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("ArchiveItemsDeleted", archiveItemIds));
	}
	#endregion
}