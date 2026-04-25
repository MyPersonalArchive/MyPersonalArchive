namespace Backend.Core.Providers.Store;

public interface IObjectStore
{

    public Task<bool> ObjectExists(IEnumerable<string> containerNames, Guid objectId);


    public Task<IEnumerable<Guid>> ListObjectIds(IEnumerable<string> containerNames);


    public Task StoreObject(IEnumerable<string> containerNames, Guid objectId, Stream contentStream, string contentExtension, Stream metadataStream);


    public Task<(Stream contentStream, string contentExtension, Stream metadataStream)> GetObject(IEnumerable<string> containerNames, Guid objectId);


    public Task DeleteObject(IEnumerable<string> containerNames, Guid objectId);

}