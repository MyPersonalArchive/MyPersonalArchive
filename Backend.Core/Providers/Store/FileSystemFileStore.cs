using Backend.Core.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Backend.Core.Providers.Store;

[RegisterService(ServiceLifetime.Transient)]
public class FileSystemFileStore : IFileStore
{
	private readonly string _storeRoot;
	private IEnumerable<string> _baseContainerNames = [];

	/// <summary>
	/// Indicates whether the store has been configured. Once configured, the base container names cannot be changed.
	/// </summary>
	private bool _isFrozen = false;


	public FileSystemFileStore(IOptions<AppConfig> config)
	{
		_storeRoot = config.Value.RootFolder;
	}


	public void Configure(IEnumerable<string> baseContainerNames)
	{
		if (_isFrozen)
		{
			throw new InvalidOperationException("The store has already been configured and cannot be reconfigured.");
		}

		_baseContainerNames = baseContainerNames;
		_isFrozen = true;
	}


	public Task<bool> FileExists(IEnumerable<string> containerNames, string filename)
	{
		var filePath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames, filename]);
		return Task.FromResult(File.Exists(filePath));
	}


	public Task<IEnumerable<string[]>> ListFiles(IEnumerable<string> containerNames, bool recursive = false)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		if (!Directory.Exists(folderPath))
		{
			return Task.FromResult(Enumerable.Empty<string[]>());
		}

		if (recursive)
		{
			var filenames = Directory.GetFiles(folderPath, "*", new EnumerationOptions { RecurseSubdirectories = true });
			var relativeParts = filenames.Select(filePath => Path.GetRelativePath(folderPath, filePath).Split(Path.DirectorySeparatorChar));
			return Task.FromResult(relativeParts);
		}
		else
		{
			var filenames = Directory.GetFiles(folderPath, "*", SearchOption.TopDirectoryOnly);
			var filenamesOnly = filenames.Select(filePath => Path.GetFileName(filePath));
			return Task.FromResult(filenamesOnly.Select(name => new string[] { name }));
		}
	}


	public Task<IEnumerable<string[]>> ListFolders(IEnumerable<string> containerNames, bool recursive = false)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		if (!Directory.Exists(folderPath))
		{
			throw new DirectoryNotFoundException($"The specified folder path does not exist: {folderPath}");
		}

		if (recursive)
		{
			var directories = Directory.GetDirectories(folderPath, "*", new EnumerationOptions { RecurseSubdirectories = true });
			var relativeNames = directories.Select(dirPath => Path.GetRelativePath(folderPath, dirPath).Split(Path.DirectorySeparatorChar));
			return Task.FromResult(relativeNames);
		}
		else
		{
			var directories = Directory.GetDirectories(folderPath, "*", SearchOption.TopDirectoryOnly);
			var folderNames = directories.Select(dirPath => Path.GetFileName(dirPath));
			return Task.FromResult(folderNames.Select(name => new string[] { name }));
		}
	}


	public async Task StoreFile(IEnumerable<string> containerNames, string filename, Stream contentStream)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		Directory.CreateDirectory(folderPath);

		var filePath = Path.Combine(folderPath, filename);

		contentStream.Seek(0, SeekOrigin.Begin);
		await using var fileStream = File.Create(filePath);
		await contentStream.CopyToAsync(fileStream);
	}


	/// <summary>
	/// Gets a writable stream for the specified file. If the file already exists, it will be overwritten.
	/// </summary>
	/// <remarks>
	/// The caller is responsible for disposing the stream after use. The stream will be flushed and closed when disposed.
	/// </remarks>
	/// <param name="containerNames"></param>
	/// <param name="filename"></param>
	/// <returns></returns>
	public async Task<Stream> GetWritableFileStream(IEnumerable<string> containerNames, string filename)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		Directory.CreateDirectory(folderPath);

		var filePath = Path.Combine(folderPath, filename);

		var fileStream = File.Open(filePath, FileMode.Create, FileAccess.Write, FileShare.None);
		return fileStream;
	}


	public async Task AppendToFile(IEnumerable<string> containerNames, string filename, Stream contentStream)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		Directory.CreateDirectory(folderPath);

		var filePath = Path.Combine(folderPath, filename);

		contentStream.Seek(0, SeekOrigin.End);
		await using var fileStream = File.Open(filePath, FileMode.Append, FileAccess.Write);
		await contentStream.CopyToAsync(fileStream);
	}


	public Task<Stream> GetFile(IEnumerable<string> containerNames, string filename)
	{
		var filePath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames, filename]);
		// var fileStream = File.OpenRead(filePath);
		var fileStream = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
		return Task.FromResult((Stream)fileStream);
	}


	public Task DeleteFile(IEnumerable<string> containerNames, string filename)
	{
		var filePath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames, filename]);
		File.Delete(filePath);

		return Task.CompletedTask;
	}
}