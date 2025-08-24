
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

    public bool StartTenant(int tenantId)
    {
        if (_restoreTenants.ContainsKey(tenantId))
            return false;

        _restoreTenants[tenantId] = new TenantRestore
        {
            TenantId = tenantId,
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

        var backupProvider = scope.ServiceProvider.GetService<IBackupProvider>()!;
        var encryptionService = scope.ServiceProvider.GetService<IEncryptionService>()!;
        var appConfig = scope.ServiceProvider.GetRequiredService<IOptions<AppConfig>>()!;

        await foreach (var item in backupProvider.RestoreAsync(restore.TenantId))
        {
            if (restore.TokenSource.IsCancellationRequested)
                break;

            var decryptedStream = encryptionService.Decrypt(item.stream, "password");
            var zipArchive = ZipUtils.UnZipStream(decryptedStream);

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
                else if (entry.Name.StartsWith("Blob"))
                {
                    using var reader = new StreamReader(entry.Open());
                    await fileProvider.Store(entry.Name, "application/octet-stream", reader.BaseStream);
                }
            }
        }

        restore.Status = TenantRestore.RestoreStatus.Finished;
    }
}