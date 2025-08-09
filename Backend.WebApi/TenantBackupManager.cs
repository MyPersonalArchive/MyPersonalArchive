using Backend.Core.Providers;
using Backend.DbModel.Database;
using Microsoft.EntityFrameworkCore;

public class TenantBackupManager
{
    private readonly Dictionary<int, (CancellationTokenSource tokenSource, Task task)> _backupTenants = [];
    private readonly IServiceScopeFactory _scopeFactory;

    public TenantBackupManager(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }
    
    public bool StartTenant(int tenantId, TimeSpan interval)
    {
        if (_backupTenants.ContainsKey(tenantId))
            return false;

        var tokenSource = new CancellationTokenSource();
        var task = Task.Run(() => RunBackupAsync(tenantId, interval, tokenSource.Token));

        _backupTenants[tenantId] = (tokenSource, task);

        Console.WriteLine($"Started backup for tenant {tenantId}");
        return true;
    }

    public bool StopTenant(int tenantId)
    {
        if (!_backupTenants.TryGetValue(tenantId, out var cancellationTokenAndTask))
            return false;

        cancellationTokenAndTask.tokenSource.Cancel();
        _backupTenants.Remove(tenantId);

        Console.WriteLine($"Stopped backup for tenant {tenantId}");
        return true;
    }

    private async Task RunBackupAsync(int tenantId, TimeSpan interval, CancellationToken token)
    {
        while (!token.IsCancellationRequested)
        {
             using var scope = _scopeFactory.CreateScope();

            var dbContext = ActivatorUtilities.CreateInstance<MpaDbContext>(
                scope.ServiceProvider,
                new StaticAmbientDataResolver(tenantId)
            );

            var lastRun = dbContext.Backups.FirstOrDefault()?.LastStartedAt ?? DateTimeOffset.MinValue;

            try
            {
                //Is it instead possible to backup the entire ArchiveItem item info and its blobs?
                //This would make restoring much easier and more complete.
                //How do I know if an archiveItem.blobs has had any changes to it?


                var blobsSinceLastBackup = await dbContext.Blobs
                                        .Where(blob => blob.UploadedAt.CompareTo(lastRun) > 0)
                                        .ToListAsync();

                if (blobsSinceLastBackup.Any())
                {
                    var fileProvider = ActivatorUtilities.CreateInstance<FileStorageProvider>(
                        scope.ServiceProvider,
                        new StaticAmbientDataResolver(tenantId)
                    );

                    var backupClient = scope.ServiceProvider.GetRequiredService<BackupClient>();

                    foreach (var blob in blobsSinceLastBackup)
                    {
                        var fileId = Path.GetFileNameWithoutExtension(blob.PathInStore);
                        var stream = fileProvider.GetFile(blob.PathInStore, out var metadata);
                        if (stream == null)
                            continue;

                        await backupClient.Backup(stream, blob.TenantId, blob.Id, Guid.Parse(fileId), metadata);
                    }
                }
            }
            catch (Exception e)
            {
                Console.WriteLine($"Backup for tenant {tenantId} failed: {e.Message}");
            }

            await Task.Delay(interval, token);
        }
    }
}