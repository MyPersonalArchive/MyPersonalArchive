using Backend.DbModel.Database.EntityModels;
using Message = Backend.WebApi.Services.SignalRService.Message;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobService
{
	private readonly SignalRService _signalRService;
	public BlobService(SignalRService signalRService)
	{
		_signalRService = signalRService;
	}

	
	#region SignalR message creators
	public async Task PublishBlobsAddedMessage(IEnumerable<Blob> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsAddedMessage(IEnumerable<int> blobIds)
	{
		if(blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("BlobsAdded", blobIds));
	}

	public async Task PublishBlobsUpdatedMessage(IEnumerable<Blob> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsUpdatedMessage(IEnumerable<int> blobIds)
	{
		if(blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("BlobsUpdated", blobIds));
	}

	public async Task PublishBlobsDeletedMessage(IEnumerable<Blob> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id).ToList());
	public async Task PublishBlobsDeletedMessage(IEnumerable<int> blobIds)
	{
		if(blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new Message("BlobsDeleted", blobIds));
	}
	#endregion
}
