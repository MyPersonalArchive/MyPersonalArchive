namespace Backend.Core.Providers.Store;



public interface IFileStore
{
	public void Configure(IEnumerable<string> baseContainerNames);

	public Task<bool> FileExists(IEnumerable<string> containerNames, string filename);

	public Task<IEnumerable<string>> ListFiles(IEnumerable<string> containerNames);

	public Task StoreFile(IEnumerable<string> containerNames, string filename, Stream contentStream);

	public Task<Stream> GetWritableFileStream(IEnumerable<string> containerNames, string filename);
	
	public Task AppendToFile(IEnumerable<string> containerNames, string filename, Stream contentStream);

	public Task<Stream> GetFile(IEnumerable<string> containerNames, string filename);

	public Task DeleteFile(IEnumerable<string> containerNames, string filename);
}