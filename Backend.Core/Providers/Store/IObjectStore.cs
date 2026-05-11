namespace Backend.Core.Providers.Store;

public interface IObjectStore
{
	public Task<bool> ObjectExists(IEnumerable<string> containerNames, Guid objectId);

	public Task<IEnumerable<Guid>> ListObjectIds(IEnumerable<string> containerNames);

	public Task<IEnumerable<string>> ListExtensions(IEnumerable<string> containerNames, Guid objectId);

	public Task StoreObject(IEnumerable<string> containerNames, Guid objectId, string extension, Stream stream);

	public Task<Stream> GetObject(IEnumerable<string> containerNames, Guid objectId, string extension);

	public Task DeleteObject(IEnumerable<string> containerNames, Guid objectId);
}