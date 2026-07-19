using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Mpa.Core.Store;

[RegisterService(ServiceLifetime.Scoped)]
public class BlobObjectStore : ObjectStore
{
	public BlobObjectStore(BlobObjectStoreFileStoreFactory fileStoreFactory)
		: base(fileStoreFactory.GetFileStore())
	{
	}
}
