namespace Backend.Core.Providers.Store;

public class FileSystemObjectStore : IObjectStore
{
    private const string MetadataExtension = ".metadata";

    private readonly string _storeRoot;

    public FileSystemObjectStore()
    {
        //TODO: How to handle systemwide vs tenant specific vs. user specific?
        //  Flags on all methods, or can it be set in constructor?
        _storeRoot = ""; //TODO: get from config
    }

    public async Task<bool> ObjectExists(IEnumerable<string> containerNames, Guid objectId)
    {
        throw new NotImplementedException();
    }

    public Task<IEnumerable<Guid>> ListObjectIds(IEnumerable<string> containerNames)
    {
        var folderPath = Path.Combine([_storeRoot, .. containerNames]);
        if (!Directory.Exists(folderPath))
        {
            return Task.FromResult(Enumerable.Empty<Guid>());
        }

        var objectIds = Directory
            .GetDirectories(folderPath)             // Folders at level 1 (00-ff)
            .SelectMany(Directory.GetDirectories)   // Folders at level 2 (0000-ffff)
            .SelectMany(Directory.GetDirectories)   // Folders at level 3 (000000-ffffff)
            .SelectMany(level3 => Directory.GetFiles(level3, $"*.{MetadataExtension}"))     // List all metadata files under level 3 folders
            .Select(filePath => Path.GetFileNameWithoutExtension(filePath))                 // Get the filename without extension, which should be the objectId
            .Select(filenameWithoutExtension => Guid.Parse(filenameWithoutExtension));

        return Task.FromResult(objectIds);
    }

    public async Task StoreObject(IEnumerable<string> containerNames, Guid objectId, Stream contentStream, string contentExtension, Stream metadataStream)
    {
        var folderPath = Path.Combine([_storeRoot, .. containerNames, .. ObjectPathPartsFromObjectId(objectId)]);
        Directory.CreateDirectory(folderPath);

        var objectIdStringDashed = objectId.ToString("D"); // Get the Guid 'string with dashes
        var filePath = Path.Combine(folderPath, $"{objectIdStringDashed}.{contentExtension}");

        contentStream.Seek(0, SeekOrigin.Begin);
        await using var fileStream = File.OpenWrite(filePath);
        await contentStream.CopyToAsync(fileStream);

        var metadataPath = Path.ChangeExtension(filePath, MetadataExtension);
        metadataStream.Seek(0, SeekOrigin.Begin);
        await using var metadataFileStream = File.OpenWrite(metadataPath);
        await metadataStream.CopyToAsync(metadataFileStream);
    }

    public async Task<(Stream contentStream, string contentExtension, Stream metadataStream)> GetObject(IEnumerable<string> containerNames, Guid objectId)
    {
        throw new NotImplementedException();
    }

    public async Task DeleteObject(IEnumerable<string> containerNames, Guid objectId)
    {
        throw new NotImplementedException();
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