using Backend.Core.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Core.Providers.Store;


[RegisterService(ServiceLifetime.Scoped)]
public class ObjectStoreFileStoreFactory
{
	private readonly IFileStore _fileStore;

	public ObjectStoreFileStoreFactory(IFileStore fileStore, IAmbientDataResolver resolver)
	{
		var tenantId = resolver?.GetCurrentTenantId() ?? throw new Exception("Missing tenant id in ambient data");

		_fileStore = fileStore;
		_fileStore.Configure(["Blobs", tenantId.ToString()]);
	}

	public IFileStore GetFileStore(IEnumerable<string> containerNames)
	{
		return _fileStore;
	}
}


[RegisterService(ServiceLifetime.Scoped)]
public class SystemSettingsFileStoreFactory
{
	private readonly IFileStore _fileStore;

	public SystemSettingsFileStoreFactory(IFileStore fileStore)
	{
		_fileStore = fileStore;
		_fileStore.Configure(["Settings", "System"]);
	}

	public IFileStore GetFileStore()
	{
		return _fileStore;
	}
}


[RegisterService(ServiceLifetime.Scoped)]
public class TenantSettingsFileStoreFactory
{
	private readonly IFileStore _fileStore;

	public TenantSettingsFileStoreFactory(IFileStore fileStore, IAmbientDataResolver resolver)
	{
		var tenantId = resolver?.GetCurrentTenantId() ?? throw new Exception("Missing tenant id in ambient data");

		_fileStore = fileStore;
		_fileStore.Configure(["Settings", tenantId.ToString()]);
	}

	public IFileStore GetFileStore()
	{
		return _fileStore;
	}
}


[RegisterService(ServiceLifetime.Scoped)]
public class UserSettingsFileStoreFactory
{
	private readonly IFileStore _fileStore;


	public UserSettingsFileStoreFactory(IFileStore fileStore, IAmbientDataResolver resolver)
	{
		var tenantId = resolver?.GetCurrentTenantId() ?? throw new Exception("Missing tenant id in ambient data");
		var username = resolver?.GetCurrentUsername() ?? throw new Exception("Missing username in ambient data");

		_fileStore = fileStore;
		_fileStore.Configure(["Settings", tenantId.ToString(), username]);
	}


	public IFileStore GetFileStore()
	{
		return _fileStore;
	}
}