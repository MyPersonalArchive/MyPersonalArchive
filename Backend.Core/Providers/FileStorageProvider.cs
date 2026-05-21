using Backend.Core.Infrastructure;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Backend.Core.Providers;


//If we find a common implementation for storage types this can be IStorageProvider which 
//can handle cloud, local etc... Currently, we only have local file storage
public interface IFileStorageProvider
{
	Task<string> Store(string fileName, string mimeType, Stream stream);
	// Task StoreForKnownMetadata(string fileName, Stream stream);
	Stream GetFile(string filePath, out FileMetadata metadata);
	void DeleteFile(string fileName);
}

public class FileStorageProvider : IFileStorageProvider
{
	private const string MetadataExtension = ".metadata";

	private readonly string _baseFolder;
	private readonly IAmbientDataResolver _resolver;

	public FileStorageProvider(IOptions<AppConfig> config, IAmbientDataResolver resolver)
	{
		_resolver = resolver;
		_baseFolder = Path.Combine(config.Value.RootFolder, "Blobs", resolver.GetCurrentTenantId().ToString());
	}

	public async Task<string> Store(string fileName, string mimeType, Stream stream)
	{
		//TODO: If PDF, store the number of pages in the metadata
		var username = _resolver.GetCurrentUsername() ?? throw new Exception("Missing NameIdentifier claim");

		var uniqueFileId = Guid.NewGuid().ToString();
		var folderPath = GetFolderPath(uniqueFileId);
		if (!Directory.Exists(folderPath))
		{
			Directory.CreateDirectory(folderPath);
		}

		var filePath = Path.Combine(folderPath, uniqueFileId) + Path.GetExtension(fileName);

		await File.WriteAllTextAsync(Path.ChangeExtension(filePath, MetadataExtension), JsonConvert.SerializeObject(new FileMetadata
		{
			MimeType = mimeType,
			Size = stream.Length,
			OriginalFilename = fileName,
			Hash = Convert.ToHexString(stream.ComputeSha256Hash()),
			UploadedAt = DateTimeOffset.Now,
			UploadedBy = username
		}));

		stream.Seek(0, SeekOrigin.Begin);
		await using var fileStream = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
		await stream.CopyToAsync(fileStream);

		return filePath;
	}

	public async Task StoreForKnownMetadata(string fileName, Stream stream)
	{
		var fileId = Path.GetFileNameWithoutExtension(fileName);
		var folderPath = GetFolderPath(Path.GetFileNameWithoutExtension(fileName));
		if (!Directory.Exists(folderPath))
		{
			Directory.CreateDirectory(folderPath);
		}

		var filePath = Path.Combine(folderPath, fileId) + Path.GetExtension(fileName);

		// stream.Seek(0, SeekOrigin.Begin);
		await using var fileStream = new FileStream(filePath, FileMode.Create);
		await stream.CopyToAsync(fileStream);
	}

	public Stream GetFile(string filePath, out FileMetadata metadata)
	{
		var metadataPath = Path.ChangeExtension(filePath, MetadataExtension);

		metadata = JsonConvert.DeserializeObject<FileMetadata>(File.ReadAllText(metadataPath));

		var stream = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);   //This stream will be returned to the caller, and should NOT be disposed here
		stream.Position = 0;
		return stream;
	}


	public void DeleteFile(string fileName)
	{
		var filePath = Path.Combine(GetFolderPath(Path.GetFileNameWithoutExtension(fileName)), fileName);
		var metadataPath = Path.ChangeExtension(filePath, MetadataExtension);

		if (File.Exists(metadataPath)) File.Delete(metadataPath);

		if (File.Exists(filePath)) File.Delete(filePath);
	}

	private string GetFolderPath(string uniqueFileName) => Path.Combine(_baseFolder, uniqueFileName[..2], uniqueFileName[..4], uniqueFileName[..6]);
}
