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

		var files = await _fileStore.ListFiles(ObjectPathPartsFromObjectId(objectId));
		return files.Any(pathParts => pathParts[^1].StartsWith(objectIdStringDashed));
	}

	public async Task<IEnumerable<Guid>> ListObjectIds()
	{
		var allFiles = await _fileStore.ListFiles([], recursive: true);
		var allObjectIds = allFiles.Select(pathParts => pathParts[^1])
						.Select(filename => filename.Split('.')[0]) // Get the filename without extension, which should be the objectId
						.Distinct()
						.Select(Guid.Parse);

		return allObjectIds;
	}


	public async Task<IEnumerable<string>> ListExtensions(Guid objectId)
	{

		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes

		var allFiles = await _fileStore.ListFiles(ObjectPathPartsFromObjectId(objectId));
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
		await _fileStore.StoreFile(ObjectPathPartsFromObjectId(objectId), filename, stream);
	}


	/// <summary>
	/// Returns the stream for the given objectId and extension. This stream can be used to both read and write data to the store.
	/// If the file already exists, it will be overwritten.
	/// </summary>
	public async Task UpdateObjectStream(Guid objectId, string extension, Action<Stream> updateFunc)
	{
		using var stream = await _fileStore.GetReadWriteFileStream(ObjectPathPartsFromObjectId(objectId), $"{objectId.ToString("D")}.{extension}");

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

		return _fileStore.GetWritableFileStream(ObjectPathPartsFromObjectId(objectId), filename);
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

		return _fileStore.GetReadWriteFileStream(ObjectPathPartsFromObjectId(objectId), filename);
	}


	public async Task<Stream?> GetObject(Guid objectId, string extension)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		return await _fileStore.GetFile(ObjectPathPartsFromObjectId(objectId), $"{objectIdStringDashed}.{extension}");
	}

	public async Task DeleteObject(Guid objectId)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes

		var allFiles = await _fileStore.ListFiles(ObjectPathPartsFromObjectId(objectId));
		var filesForObject = allFiles
			.Select(pathParts => pathParts[^1])
			.Where(filename => filename.StartsWith(objectIdStringDashed));

		foreach (var file in filesForObject)
		{
			await _fileStore.DeleteFile(ObjectPathPartsFromObjectId(objectId), file);
		}
	}


	/// <summary>
	///   This will create the folder path parts for an objectId.
	///   Ie. the objectId 12345678-90ab-cdef-1234-567890abcdef will result in the path ["12", "1234", "123456"]
	/// </summary>
	/// <param name="objectId"></param>
	/// <returns></returns>
	private string[] ObjectPathPartsFromObjectId(Guid objectId)
	{
		var objectIdStringStripped = objectId.ToString("N"); // Get the Guid 'string without dashes
		return [
			objectIdStringStripped.Substring(0, 2),
			objectIdStringStripped.Substring(0, 4),
			objectIdStringStripped.Substring(0, 6)
		];
	}
}