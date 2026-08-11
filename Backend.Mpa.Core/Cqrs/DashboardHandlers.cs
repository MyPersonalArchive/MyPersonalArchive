using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Mpa.Core.Store;


namespace Backend.Mpa.Core.Cqrs;

[RequireRole("Owner", "Administrator")]
[RequireOrganizationId]
public class GetStats : IQuery<GetStats, GetStats.Response>
{
	// No parameters to get stats for the current organization

	public class Response
	{
		public required long AvailableStorage { get; set; }
		public required long TotalUsedStorage { get; set; }
		public required long BlobStorage { get; set; }
		public required int BlobCount { get; set; }
		public required long ArchiveItemStorage { get; set; }
		public required int ArchiveItemCount { get; set; }
	}
}


public class DashboardHandler :
	IAsyncQueryHandler<GetStats, GetStats.Response>
{
	private readonly BlobObjectStoreFileStoreFactory _blobStoreFactory;
	private readonly ArchiveObjectStoreFileStoreFactory _archiveStoreFactory;
	private readonly TenantSettingsFileStoreFactory _tenantSettingsStoreFactory;
	private readonly BlobObjectStore _blobObjectStore;
	private readonly ArchiveObjectStore _archiveObjectStore;

	public DashboardHandler(
		BlobObjectStoreFileStoreFactory blobStoreFactory,
		ArchiveObjectStoreFileStoreFactory archiveStoreFactory,
		TenantSettingsFileStoreFactory tenantSettingsStoreFactory,
		BlobObjectStore blobObjectStore,
		ArchiveObjectStore archiveObjectStore)
	{
		_blobStoreFactory = blobStoreFactory;
		_archiveStoreFactory = archiveStoreFactory;
		_tenantSettingsStoreFactory = tenantSettingsStoreFactory;
		_blobObjectStore = blobObjectStore;
		_archiveObjectStore = archiveObjectStore;
	}


	public async Task<GetStats.Response> Handle(GetStats query)
	{
		var blobStoreUsedTask = _blobStoreFactory.GetFileStore().GetStorageUsed();
		var archiveStoreUsedTask = _archiveStoreFactory.GetFileStore().GetStorageUsed();
		var tenantSettingsStoreUsedTask = _tenantSettingsStoreFactory.GetFileStore().GetStorageUsed();	// this includes user settings as well, since they are nested inside the tenantSetting store
		var blobCountTask = _blobObjectStore.GetObjectCount();
		var archiveItemCountTask = _archiveObjectStore.GetObjectCount();

		await Task.WhenAll(blobStoreUsedTask, archiveStoreUsedTask, tenantSettingsStoreUsedTask, blobCountTask, archiveItemCountTask);

		var blobStoreUsed = blobStoreUsedTask.Result;
		var archiveStoreUsed = archiveStoreUsedTask.Result;
		var tenantSettingsStoreUsed = tenantSettingsStoreUsedTask.Result;

		var totalUsedStorage =
			blobStoreUsed +
			archiveStoreUsed +
			tenantSettingsStoreUsed;

		return new GetStats.Response
		{
			AvailableStorage = 1024*1024*1024, // TODO: No storage quota/plan concept exists yet
			TotalUsedStorage = totalUsedStorage,
			BlobStorage = blobStoreUsed,
			ArchiveItemStorage = archiveStoreUsed,
			BlobCount = blobCountTask.Result,
			ArchiveItemCount = archiveItemCountTask.Result
		};
	}
}
