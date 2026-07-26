using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.Core.Store;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobPublicationService
{
	private readonly ISignalRService _signalRService;

	public BlobPublicationService(ISignalRService signalRService)
	{
		_signalRService = signalRService;
	}



	#region SignalR message creators
	public async Task PublishBlobsAddedMessage(IEnumerable<BlobModel> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsAddedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsAdded", blobIds));
	}


	public async Task PublishBlobsUpdatedMessage(IEnumerable<BlobModel> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsUpdatedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsUpdated", blobIds));
	}


	public async Task PublishBlobsDeletedMessage(IEnumerable<BlobModel> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsDeletedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsDeleted", blobIds));
	}
	#endregion
}
