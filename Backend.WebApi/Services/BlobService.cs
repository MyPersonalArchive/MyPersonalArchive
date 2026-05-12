using Backend.Core.Infrastructure;
using Backend.Core.Services;
using Backend.DbModel.Database.EntityModels;

namespace Backend.WebApi.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobService
{
	private readonly ISignalRService _signalRService;
	public BlobService(ISignalRService signalRService)
	{
		_signalRService = signalRService;
	}


	// TODO: Implement these methods in a way that they also publish the appropriate SignalR messages after performing their main function
	// - GetBlob
	// - ListBlobs
	// - DeleteBlob
	// - UploadBlob or StoreBlob
	// - GetBlob


	#region SignalR message creators
	public async Task PublishBlobsAddedMessage(IEnumerable<Guid> blobIds) => throw new NotImplementedException();
	public async Task PublishBlobsAddedMessage(IEnumerable<Blob> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsAddedMessage(IEnumerable<int> blobIds)
	{
		if(blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsAdded", blobIds));
	}

	public async Task PublishBlobsUpdatedMessage(IEnumerable<Guid> blobIds) => throw new NotImplementedException();
	public async Task PublishBlobsUpdatedMessage(IEnumerable<Blob> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsUpdatedMessage(IEnumerable<int> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsUpdated", blobIds));
	}

	public async Task PublishBlobsDeletedMessage(IEnumerable<Guid> blobIds) => throw new NotImplementedException();
	public async Task PublishBlobsDeletedMessage(IEnumerable<Blob> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id).ToList());
	public async Task PublishBlobsDeletedMessage(IEnumerable<int> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsDeleted", blobIds));
	}
	#endregion

	#region blob handling methods
	public async Task StoreBlob(Guid blobId, Stream blobStream, Stream metadataStream)
	{
		await PublishBlobsAddedMessage([blobId]);
		throw new NotImplementedException();
	}

	public async Task<Stream> GetBlob(Guid blobId)
	{
		throw new NotImplementedException();
	}

	public async Task DeleteBlob(Guid blobId)
	{
		await PublishBlobsDeletedMessage([blobId]);
		throw new NotImplementedException();
	}

	#endregion
}
