using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Store;

[RegisterService(ServiceLifetime.Scoped)]
public class ArchiveObjectStore : ObjectStore
{
	public ArchiveObjectStore(ArchiveObjectStoreFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
	}
}
