using System.Text;
using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

//Talking points with Arjan
// How to supply the user password for backups?
// Send password via the StartBackup https request in body?
//      - This has to be supplied everytime a backup request is initiated
//      - This means that everytime the system goes down, or it has to be restarted the backup process has to be started with the password again
// Store password in a secure storage? Which one? How?
//      - We can read the passsword and automatically start backup process again


public class TenantBackup
{
    public enum BackupStatus
    {
        NotStarted,
        Running,
        Stopped
    }

    public required int TenantId { get; set; }
    public required string Password { get; set; }
    public DateTime? LastBackupTime { get; set; }
    public DateTime? NextBackupTime { get; set; }
    public required CancellationTokenSource TokenSource { get; set; }
    public required TimeSpan Interval { get; set; }
    public BackupStatus Status { get; set; } = BackupStatus.NotStarted;
}

public class TenantBackupManager
{
    private readonly Dictionary<int, TenantBackup> _backupTenants = [];
    private readonly IServiceScopeFactory _scopeFactory;

    public TenantBackupManager(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public bool StartTenant(int tenantId, TimeSpan interval, string passsword)
    {
        if (_backupTenants.ContainsKey(tenantId))
            return false;

        _backupTenants[tenantId] = new TenantBackup
        {
            TenantId = tenantId,
            Password = passsword,
            LastBackupTime = null,
            NextBackupTime = null,
            TokenSource = new CancellationTokenSource(),
            Interval = interval
        };

        Task.Run(() => RunBackupAsync(_backupTenants[tenantId]));

        Console.WriteLine($"Started backup for tenant {tenantId}");
        return true;
    }

    public bool StopTenant(int tenantId)
    {
        if (!_backupTenants.TryGetValue(tenantId, out var backup))
            return false;

        backup.TokenSource.Cancel();
        _backupTenants.Remove(tenantId);

        Console.WriteLine($"Stopped backup for tenant {tenantId}");
        return true;
    }

    public TenantBackup? GetBackupInformation(int tenantId)
    {
        if (!_backupTenants.TryGetValue(tenantId, out var backup))
        {
            return null;
        }
        return _backupTenants[tenantId];
    }

    private async Task RunBackupAsync(TenantBackup backup)
    {
        try
        {
            while (!backup.TokenSource.IsCancellationRequested)
            {
                backup.Status = TenantBackup.BackupStatus.Running;

                using var scope = _scopeFactory.CreateScope();

                var dbContext = ActivatorUtilities.CreateInstance<MpaDbContext>(
                    scope.ServiceProvider,
                    new StaticAmbientDataResolver(backup.TenantId)
                );

                var fileProvider = ActivatorUtilities.CreateInstance<FileStorageProvider>(
                            scope.ServiceProvider,
                            new StaticAmbientDataResolver(backup.TenantId)
                        );

                var backupProviderFactory = scope.ServiceProvider.GetService<BackupProviderFactory>()!;
                var encryptionServiceFactory = scope.ServiceProvider.GetService<EncryptionProviderFactory>()!;
                var appConfig = scope.ServiceProvider.GetService<IOptions<AppConfig>>()!;

                await backupProviderFactory.CurrentProvider.Connect(appConfig.Value.TargetBackupSystemAddress);

                var archiveItems = dbContext.ArchiveItems
                    .Include(archiveItem => archiveItem.Blobs)
                    // .Include(archiveItem => archiveItem.Tags) // This references all archiveitems again which causes the data to be too large.
                    .Where(archiveItem => archiveItem.TenantId == backup.TenantId)
                    .AsAsyncEnumerable();

                await foreach (var archiveItem in archiveItems)
                {
                    var json = JsonConvert.SerializeObject(archiveItem);

                    Console.WriteLine($"{json}");

                    var zipEntries = new Dictionary<string, Stream>
                    {
                        { $"ArchiveItem_{archiveItem.Id}.json", new MemoryStream(Encoding.UTF8.GetBytes(json)) }
                    };

                    if (archiveItem.Blobs != null)
                    {
                        foreach (var blob in archiveItem.Blobs)
                        {
                            var stream = fileProvider.GetFile(blob.PathInStore, out var metadata);
                            if (stream == null)
                                continue;

                            zipEntries.Add($"{Path.GetFileNameWithoutExtension(blob.OriginalFilename)}", stream);
                            zipEntries.Add($"{Path.GetFileNameWithoutExtension(blob.OriginalFilename)}" + ".metadata", new MemoryStream(Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(metadata))));
                        }
                    }

                    var zipStream = await ZipUtils.CreateZipFromStreamsAsync(zipEntries);
                    var encryptedStream = encryptionServiceFactory.CurrentProvider.Encrypt(zipStream, backup.Password);

                    await backupProviderFactory.CurrentProvider.BackupAsync(backup.TenantId, $"ArchiveItem_{archiveItem.Id}.zip.enc", encryptedStream);

                    //Not sure if this is needed
                    zipEntries.Values.ToList().ForEach(d => d.Dispose());
                    zipStream.Dispose();
                    encryptedStream.Dispose();
                }

                backup.LastBackupTime = DateTime.UtcNow;
                backup.NextBackupTime = backup.LastBackupTime + backup.Interval;
                backup.Status = TenantBackup.BackupStatus.Stopped;
                await Task.Delay(backup.Interval, backup.TokenSource.Token);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Backup for tenant {backup.TenantId} failed: {ex.Message}");
        }
    }
}