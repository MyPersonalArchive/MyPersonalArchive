using System.Text.Json;

namespace Backend.Core.Providers.Store;


public abstract class ObjectStore
{
	private readonly IFileStore _fileStore;
	public ObjectStore(IFileStore fileStore)
	{
		_fileStore = fileStore;
	}

	public async Task<bool> ObjectExists(Guid objectId)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes

		var files = await _fileStore.ListFiles([]);
		return files.Any(pathParts => pathParts[^1].StartsWith(objectIdStringDashed));
	}

	public async Task<IEnumerable<Guid>> ListObjectIds()
	{
		var allFiles = await _fileStore.ListFiles([], recursive: true);
		var allObjectIds = allFiles.Select(pathParts => pathParts[^1].Split('.'))
						.Select(parts => parts[0]) // Get the filename without extension, which should be the objectId
						.Distinct()
						.Select(Guid.Parse);
		System.Diagnostics.Debug.WriteLine($"Guids in store: {string.Join(", ", allObjectIds)}");

		return allObjectIds;
	}


	public async Task<IEnumerable<string>> ListExtensions(Guid objectId)
	{

		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes

		var allFiles = await _fileStore.ListFiles([]);
		var filesForObject = allFiles
			.Select(pathParts => pathParts[^1])
			.Where(filename => filename.StartsWith(objectIdStringDashed));

		var extensions = filesForObject
			.Select(filename => Path.GetExtension(filename))
			.Select(extension => extension.TrimStart('.'));

		return extensions;
	}

	/// <summary>
	/// Stores a stream in the store with the given objectId and extension. 
	/// </summary>
	public async Task StoreObject(Guid objectId, string extension, Stream stream)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		var filename = $"{objectIdStringDashed}.{extension}";

		stream.Seek(0, SeekOrigin.Begin);
		await _fileStore.StoreFile([], filename, stream);
	}


	/// <summary>
	/// Returns the stream for the given objectId and extension. This stream can be used to both read and write data to the store.
	/// If the file already exists, it will be overwritten.
	/// </summary>
	public async Task UpdateObjectStream(Guid objectId, string extension, Action<Stream> updateFunc)
	{
		using var stream = await _fileStore.GetReadWriteFileStream([], $"{objectId.ToString("D")}.{extension}");

		updateFunc(stream);
	}


	/// <summary>
	/// Returns an empty writable stream for the given objectId and extension. This stream can be used to write data to the store.
	/// This allows you to serialize an object directly to the stream without having to create a temporary file or memory stream.
	/// If the file already exists, it will be overwritten.
	/// </summary>
	/// <remarks>
	/// The stream returned by this method must be disposed after use to ensure that the data is flushed and the file is closed properly.
	/// </remarks>
	public Task<Stream> GetWritableObjectStream(Guid objectId, string extension)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		var filename = $"{objectIdStringDashed}.{extension}";

		return _fileStore.GetWritableFileStream([], filename);
	}


	/// <summary>
	/// Returns an empty writable stream for the given objectId and extension. This stream can be used to write data to the store.
	/// This allows you to serialize an object directly to the stream without having to create a temporary file or memory stream.
	/// If the file already exists, it will be overwritten.
	/// </summary>
	/// <remarks>
	/// The stream returned by this method must be disposed after use to ensure that the data is flushed and the file is closed properly.
	/// If the file already exists, it will be overwritten.
	/// </remarks>
	public Task<Stream> GetReadWriteObjectStream(Guid objectId, string extension)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		var filename = $"{objectIdStringDashed}.{extension}";

		return _fileStore.GetReadWriteFileStream([], filename);
	}


	public async Task<Stream?> GetObject(Guid objectId, string extension)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		return await _fileStore.GetFile([], $"{objectIdStringDashed}.{extension}");
	}


	public async Task DeleteObject(Guid objectId)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes

		var allFiles = await _fileStore.ListFiles([]);
		var filesForObject = allFiles
			.Select(pathParts => pathParts[^1])
			.Where(filename => filename.StartsWith(objectIdStringDashed));

		foreach (var file in filesForObject)
		{
			await _fileStore.DeleteFile([], file);
		}
	}
}