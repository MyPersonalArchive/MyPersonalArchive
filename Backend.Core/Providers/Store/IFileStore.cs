namespace Backend.Core.Providers.Store;


public interface IFileStore
{
	void Configure(IEnumerable<string> baseContainerNames);

	Task<bool> FileExists(IEnumerable<string> containerNames, string filename);

	Task<IEnumerable<string[]>> ListFiles(IEnumerable<string> containerNames, bool recursive = false);

	Task<IEnumerable<string[]>> ListFolders(IEnumerable<string> containerNames, bool recursive = false);

	Task StoreFile(IEnumerable<string> containerNames, string filename, Stream contentStream);

	Task<Stream> GetWritableFileStream(IEnumerable<string> containerNames, string filename);
	
	Task<Stream> GetReadWriteFileStream(IEnumerable<string> containerNames, string filename);

	Task AppendToFile(IEnumerable<string> containerNames, string filename, Stream contentStream);

	Task<Stream?> GetFile(IEnumerable<string> containerNames, string filename);

	Task DeleteFile(IEnumerable<string> containerNames, string filename);
}
