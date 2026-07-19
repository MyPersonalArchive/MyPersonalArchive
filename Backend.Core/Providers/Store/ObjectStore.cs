using Backend.Core.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

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

		var allFiles = await _fileStore.ListFiles(ObjectPathPartsFromObjectId(objectId));
		var filesForObject = allFiles
			.Select(pathParts => pathParts[^1])
			.Where(filename => filename.StartsWith(objectIdStringDashed));

		var extensions = filesForObject
			.Select(filename => Path.GetExtension(filename))
			.Select(extension => extension.TrimStart('.'));

		return extensions;
	}

	public async Task StoreObject(Guid objectId, string extension, Stream stream)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		var filename = $"{objectIdStringDashed}.{extension}";

		stream.Seek(0, SeekOrigin.Begin);
		await _fileStore.StoreFile(ObjectPathPartsFromObjectId(objectId), filename, stream);
	}

	public Task<Stream> GetWritableObjectStream(Guid objectId, string extension)
	{
		var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
		var filename = $"{objectIdStringDashed}.{extension}";

		return _fileStore.GetWritableFileStream(ObjectPathPartsFromObjectId(objectId), filename);
	}

	public async Task<Stream> GetObject(Guid objectId, string extension)
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