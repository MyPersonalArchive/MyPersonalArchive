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


	public Task<IEnumerable<string>> ListFiles(IEnumerable<string> containerNames)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		if (!Directory.Exists(folderPath))
		{
			return Task.FromResult(Enumerable.Empty<string>());
		}

		var filenames = Directory.GetFiles(folderPath)
			.Select(filePath => Path.GetFileName(filePath));

		return Task.FromResult(filenames);
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


	public async Task AppendToFile(IEnumerable<string> containerNames, string filename, Stream contentStream)
	{
		var folderPath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames]);
		Directory.CreateDirectory(folderPath);

		var filePath = Path.Combine(folderPath, filename);

		contentStream.Seek(0, SeekOrigin.Begin);
		await using var fileStream = File.Open(filePath, FileMode.Append, FileAccess.Write);
		await contentStream.CopyToAsync(fileStream);
	}


	public Task<Stream> GetFile(IEnumerable<string> containerNames, string filename)
	{
		var filePath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames, filename]);
		var fileStream = File.OpenRead(filePath);
		return Task.FromResult((Stream)fileStream);
	}


	public Task DeleteFile(IEnumerable<string> containerNames, string filename)
	{
		var filePath = Path.Combine([_storeRoot, .. _baseContainerNames, .. containerNames, filename]);
		File.Delete(filePath);

		return Task.CompletedTask;
	}
}