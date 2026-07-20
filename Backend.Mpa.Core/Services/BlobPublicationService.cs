using System.Text.Json;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Core.Services;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Backend.Mpa.DbModel.Database;
using Backend.Mpa.DbModel.Database.EntityModels;
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
	public async Task PublishBlobsAddedMessage(IEnumerable<Blob> blobs) => await PublishBlobsAddedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsAddedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsAdded", blobIds));
	}


	public async Task PublishBlobsUpdatedMessage(IEnumerable<Blob> blobs) => await PublishBlobsUpdatedMessage(blobs.Select(blob => blob.Id));
	public async Task PublishBlobsUpdatedMessage(IEnumerable<Guid> blobIds)
	{
		if (blobIds == null || !blobIds.Any())
		{
			return;
		}

		await _signalRService.PublishToTenantChannel(new ISignalRService.Message("BlobsUpdated", blobIds));
	}


	public async Task PublishBlobsDeletedMessage(IEnumerable<Blob> blobs) => await PublishBlobsDeletedMessage(blobs.Select(blob => blob.Id).ToList());
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
