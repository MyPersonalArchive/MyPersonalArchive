namespace Backend.Core.Providers.Store;

public interface IObjectStore
{
	public Task<bool> ObjectExists(Guid objectId);

	public Task<IEnumerable<Guid>> ListObjectIds();

	public Task<IEnumerable<string>> ListExtensions(Guid objectId);

	public Task StoreObject(Guid objectId, string extension, Stream stream);

	public Task<Stream> GetWritableObjectStream(Guid objectId, string v);

	public Task<Stream> GetObject(Guid objectId, string extension);

	public Task DeleteObject(Guid objectId);
}