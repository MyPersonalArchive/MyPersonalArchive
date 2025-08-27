
using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

public class TenantRestore
{
    public enum RestoreStatus
    {
        NotStarted,
        InProgress,
        Finished
    }

    public required int TenantId { get; set; }
    public required string Password { get; set; }
    public RestoreStatus Status { get; set; }
    public required CancellationTokenSource TokenSource { get; set; }
}


public class TenantRestoreManager
{

    private IServiceScopeFactory _scopeFactory;
    private readonly Dictionary<int, TenantRestore> _restoreTenants = [];

    public TenantRestoreManager(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public bool StartTenant(int tenantId, string password)
    {
        if (_restoreTenants.ContainsKey(tenantId))
            return false;

        _restoreTenants[tenantId] = new TenantRestore
        {
            TenantId = tenantId,
            Password = password,
            Status = TenantRestore.RestoreStatus.InProgress,
            TokenSource = new CancellationTokenSource()
        };

        Task.Run(() => RunRestoreAsync(_restoreTenants[tenantId]));
        return true;
    }

    public bool StopTenant(int tenantId)
    {
        if (!_restoreTenants.TryGetValue(tenantId, out var restore))
            return false;

        restore.TokenSource.Cancel();
        _restoreTenants.Remove(tenantId);
        return true;
    }

    private async Task RunRestoreAsync(TenantRestore restore)
    {
        using var scope = _scopeFactory.CreateScope();

        var dbContext = ActivatorUtilities.CreateInstance<MpaDbContext>(
            scope.ServiceProvider,
            new StaticAmbientDataResolver(restore.TenantId)
        );

        var fileProvider = ActivatorUtilities.CreateInstance<FileStorageProvider>(
            scope.ServiceProvider,
            new StaticAmbientDataResolver(restore.TenantId)
        );

        var backupProviderFactory = scope.ServiceProvider.GetService<BackupProviderFactory>()!;
        var encryptionServiceFactory = scope.ServiceProvider.GetService<EncryptionProviderFactory>()!;
        var appConfig = scope.ServiceProvider.GetService<IOptions<AppConfig>>()!;

        await backupProviderFactory.CurrentProvider.Connect(appConfig.Value.TargetBackupSystemAddress);

        await foreach (var (archiveName, stream) in backupProviderFactory.CurrentProvider.RestoreAsync(restore.TenantId))
        {
            try
            {
                if (restore.TokenSource.IsCancellationRequested)
                    break;

                Console.WriteLine($"Restoring {archiveName}...");

                var decryptedStream = encryptionServiceFactory.CurrentProvider.Decrypt(stream, restore.Password);
                var zipArchive = ZipUtils.CreateArchive(decryptedStream);

                foreach (var entry in zipArchive.Entries)
                {
                    if (restore.TokenSource.IsCancellationRequested)
                        break;

                    if (entry.Name.StartsWith("ArchiveItem"))
                    {
                        using var reader = new StreamReader(entry.Open());
                        var json = await reader.ReadToEndAsync();
                        EfBackupHelper.Restore<ArchiveItem>(dbContext, json);
                    }
                    else
                    {
                        await fileProvider.StoreForKnownMetadata(entry.Name, entry.Open());
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error restoring {archiveName}: {ex.Message}");
            }
        }

        restore.Status = TenantRestore.RestoreStatus.Finished;
        StopTenant(restore.TenantId);
    }
}