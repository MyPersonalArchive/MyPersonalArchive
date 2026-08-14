using Backend.Core.Infrastructure;
using Backend.Core.Providers.Store;
using Microsoft.Extensions.DependencyInjection;


namespace Backend.Mpa.Core.Services;

[RegisterService(ServiceLifetime.Scoped)]
public class BackupService
{
	private readonly BlobObjectStoreFileStoreFactory _blobStoreFactory;
	private readonly ArchiveObjectStoreFileStoreFactory _archiveStoreFactory;
	private readonly TenantSettingsFileStoreFactory _tenantSettingsStoreFactory;

	public BackupService(
		BlobObjectStoreFileStoreFactory blobStoreFactory,
		ArchiveObjectStoreFileStoreFactory archiveStoreFactory,
		TenantSettingsFileStoreFactory tenantSettingsStoreFactory)
	{
		_blobStoreFactory = blobStoreFactory;
		_archiveStoreFactory = archiveStoreFactory;
		_tenantSettingsStoreFactory = tenantSettingsStoreFactory;
	}


	public async Task<(Stream zipStream, string filename)> CreateTenantArchiveZipAsync()
	{
		var entries = new Dictionary<string, Stream>();

		await AddStoreFilesToZipEntries(entries, _blobStoreFactory.GetFileStore(), "Blobs");
		await AddStoreFilesToZipEntries(entries, _archiveStoreFactory.GetFileStore(), "Archive");
		await AddStoreFilesToZipEntries(entries, _tenantSettingsStoreFactory.GetFileStore(), "Settings");

		// - User settings can contain private data, so they are excluded from the backup.
		// - Any files with ".cache-" in their name are also excluded from the backup.

		try
		{
			var zipStream = await ZipUtils.CreateZipFromStreamsAsync(entries);
			var filename = $"archive-{DateTime.UtcNow:yyyyMMdd-HHmmss}.zip";
			return (zipStream, filename);
		}
		finally
		{
			foreach (var stream in entries.Values)
			{
				stream.Dispose();
			}
		}
	}


	private static async Task AddStoreFilesToZipEntries(Dictionary<string, Stream> entries, IFileStore fileStore, string prefix)
	{
		var files = await fileStore.ListFiles([], recursive: true);
		foreach (var filePathParts in files)
		{
			var containerNames = filePathParts[..^1];
			var filename = filePathParts[^1];

			if (IsCacheFile(filename))
			{
				continue;
			}

			var stream = await fileStore.GetFile(containerNames, filename);
			if (stream == null)
			{
				continue;
			}
			var entryName = prefix + "/" + string.Join('/', filePathParts);
			entries[entryName] = stream;
		}
	}


	private static bool IsCacheFile(string filename)
	{
		return filename.Split('.').Skip(1).Any(extension => extension.StartsWith("cache-"));
	}
}
