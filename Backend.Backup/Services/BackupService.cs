using System.Text;
using Backend.Backup.Providers;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Crypto;
using Backend.DbModel.Database.EntityModels;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;

namespace Backend.Backup;

public class BackupService(IServiceScope scope, int tenantId)
{
	public async Task<BackupResult> BackupArchiveItemAsync(ArchiveItem archiveItem, string target, string password, CancellationToken cancellationToken)
    {
        var result = new BackupResult();
        
        try
        {
            var fileProvider = ActivatorUtilities.CreateInstance<FileStorageProvider>(
                scope.ServiceProvider,
                new StaticAmbientDataResolver(tenantId)
            );

            var backupProviderFactory = scope.ServiceProvider.GetService<BackupProviderFactory>()!;
            var encryptionServiceFactory = scope.ServiceProvider.GetService<EncryptionProviderFactory>()!;

            var backupFileName = $"ArchiveItem_{archiveItem.Id}.zip.enc";
            result.BackupFileName = backupFileName;

            var json = JsonConvert.SerializeObject(archiveItem);
            var zipEntries = new Dictionary<string, Stream>
            {
                { $"ArchiveItem_{archiveItem.Id}.json", new MemoryStream(Encoding.UTF8.GetBytes(json)) }
            };

            long totalFileSize = Encoding.UTF8.GetBytes(json).Length;

            if (archiveItem.Blobs != null)
            {
                foreach (var blob in archiveItem.Blobs)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    
                    var stream = fileProvider.GetFile(blob.PathInStore, out var metadata);
                    if (stream == null)
                        continue;

                    zipEntries.Add($"{Path.GetFileNameWithoutExtension(blob.PathInStore)}", stream);
                    zipEntries.Add($"{Path.GetFileNameWithoutExtension(blob.PathInStore)}" + ".metadata", 
                        new MemoryStream(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(metadata))));
                    
                    totalFileSize += stream.Length;
                    if (metadata != null)
                        totalFileSize += Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(metadata)).Length;
                }
            }

            var zipStream = await ZipUtils.CreateZipFromStreamsAsync(zipEntries);
            var encryptedStream = encryptionServiceFactory.CurrentProvider!.Encrypt(zipStream, password);

            await backupProviderFactory.CurrentProvider!.BackupAsync(tenantId, backupFileName, encryptedStream);

            // Clean up resources
            zipEntries.Values.ToList().ForEach(d => d.Dispose());
            zipStream.Dispose();
            encryptedStream.Dispose();

            result.Success = true;
            result.FileSizeBytes = totalFileSize;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessage = ex.Message;
        }

        return result;
    }
}

#region Models
public class BackupResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public long FileSizeBytes { get; set; }
    public string BackupFileName { get; set; } = string.Empty;
}
#endregion
