using Backend.Core.Cqrs.Infrastructure;
using Backend.Core.Providers.Store;
using Backend.Mpa.Core.Services;
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
		public int NumberOfUsers { get; internal set; }
	}
}


public class DashboardHandler :
	IAsyncQueryHandler<GetStats, GetStats.Response>
{
	private readonly BlobObjectStoreFileStoreFactory _blobStoreFactory;
	private readonly ArchiveObjectStoreFileStoreFactory _archiveStoreFactory;
	private readonly TenantSettingsFileStoreFactory _tenantSettingsStoreFactory;
	private readonly UserSettingsFileStoreFactory _userSettingsStoreFactory;
	private readonly BlobObjectStore _blobObjectStore;
	private readonly ArchiveObjectStore _archiveObjectStore;
	private readonly KeycloakOrganizationClient _keycloakClient;
	private readonly TenantService _tenantService;
	private readonly TierService _tierService;


	public DashboardHandler(
		BlobObjectStoreFileStoreFactory blobStoreFactory,
		ArchiveObjectStoreFileStoreFactory archiveStoreFactory,
		TenantSettingsFileStoreFactory tenantSettingsStoreFactory,
		UserSettingsFileStoreFactory userSettingsStoreFactory,
		BlobObjectStore blobObjectStore,
		ArchiveObjectStore archiveObjectStore,
		KeycloakOrganizationClient keycloakClient,
		TenantService tenantService,
		TierService tierService)
	{
		_blobStoreFactory = blobStoreFactory;
		_archiveStoreFactory = archiveStoreFactory;
		_tenantSettingsStoreFactory = tenantSettingsStoreFactory;
		_userSettingsStoreFactory = userSettingsStoreFactory;
		_blobObjectStore = blobObjectStore;
		_archiveObjectStore = archiveObjectStore;
		_keycloakClient = keycloakClient;
		_tenantService = tenantService;
		_tierService = tierService;
	}


	public async Task<GetStats.Response> Handle(GetStats query)
	{
		var blobStoreUsedTask = _blobStoreFactory.GetFileStore().GetStorageUsed();
		var archiveStoreUsedTask = _archiveStoreFactory.GetFileStore().GetStorageUsed();
		var tenantSettingsStoreUsedTask = _tenantSettingsStoreFactory.GetFileStore().GetStorageUsed();
		var tenantUsersStoreUsedTask = _userSettingsStoreFactory.GetFileStore().GetStorageUsed();
		var blobCountTask = _blobObjectStore.GetObjectCount();
		var archiveItemCountTask = _archiveObjectStore.GetObjectCount();
		var usersInTenantTask = _keycloakClient.ListOrganizationGroupMembersAsync();
		var tenantSettingsTask = _tenantService.GetCurrentTenantSettingsAsync();
		var tierSettingsTask = _tierService.GetTierSettingsAsync();

		await Task.WhenAll(blobStoreUsedTask, archiveStoreUsedTask, tenantSettingsStoreUsedTask, tenantUsersStoreUsedTask, blobCountTask, archiveItemCountTask, usersInTenantTask, tenantSettingsTask, tierSettingsTask);

		var blobStoreUsed = blobStoreUsedTask.Result;
		var archiveStoreUsed = archiveStoreUsedTask.Result;
		var tenantSettingsStoreUsed = tenantSettingsStoreUsedTask.Result;
		var tenantUsersStoreUsed = tenantUsersStoreUsedTask.Result;

		var totalUsedStorage =
			blobStoreUsed +
			archiveStoreUsed +
			tenantSettingsStoreUsed +
			tenantUsersStoreUsed;

		var tierSettings = tierSettingsTask.Result;
		var currentTenantSettings = tenantSettingsTask.Result;
		var currentTier = currentTenantSettings.TierId;
		var currentTierSettings = tierSettings.Tiers.FirstOrDefault(tier => tier.Id == currentTier);
		var availableStorage = currentTierSettings?.MaxStorageBytes ?? 0;

		return new GetStats.Response
		{
			AvailableStorage = availableStorage,
			TotalUsedStorage = totalUsedStorage,
			BlobStorage = blobStoreUsed,
			ArchiveItemStorage = archiveStoreUsed,
			BlobCount = blobCountTask.Result,
			ArchiveItemCount = archiveItemCountTask.Result,
			NumberOfUsers = usersInTenantTask.Result.Count
		};
	}
}
