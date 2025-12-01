using Backend.Backup.Providers;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.Crypto;
using Backend.DbModel;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Backend.Backup;

public class TenantRestoreManager
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly Dictionary<int, TenantRestore> _restoreTenants = [];
    private readonly Func<IServiceScope, int, IBackupProgressReporter>? _progressReporterFactory;

    public TenantRestoreManager(IServiceScopeFactory scopeFactory, Func<IServiceScope, int, IBackupProgressReporter>? progressReporterFactory = null)
    {
        _scopeFactory = scopeFactory;
        _progressReporterFactory = progressReporterFactory;
    }

    public bool StartTenant(int tenantId, string password, string? target = null)
    {
        if (_restoreTenants.ContainsKey(tenantId))
            return false;

        _restoreTenants[tenantId] = new TenantRestore
        {
            TenantId = tenantId,
            Password = password,
            Target = target, // null means use appConfig.TargetBackupSystemAddress
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

    public RestoreStatusResponse GetStatus(int tenantId)
    {
        if (!_restoreTenants.TryGetValue(tenantId, out var restore))
        {
            return new RestoreStatusResponse
            {
                IsRestoring = false,
                Status = "NotStarted",
                FilesRestored = 0,
                TotalFiles = 0
            };
        }

        return new RestoreStatusResponse
        {
            IsRestoring = true,
            Status = restore.Status.ToString(),
            FilesRestored = restore.FilesRestored,
            TotalFiles = restore.TotalFiles,
            CurrentFile = restore.CurrentFile,
            ErrorMessage = restore.ErrorMessage
        };
    }

    private async Task RunRestoreAsync(TenantRestore restore)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            
            // Create tenant-specific progress reporter
            var progressReporter = _progressReporterFactory?.Invoke(scope, restore.TenantId);

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

            // Use provided target or fallback to appConfig
            var target = restore.Target ?? appConfig.Value.TargetBackupSystemAddress;
            
            // Switch to appropriate provider based on target format
            if (target.StartsWith("webrtc:"))
            {
                backupProviderFactory.SetProvider("WebRTC");
            }
            else
            {
                backupProviderFactory.SetProvider("BuddyTarget");
            }
            
            await backupProviderFactory.CurrentProvider!.Connect(target);

            // Initialize progress
            restore.TotalFiles = 0;
            restore.Status = TenantRestore.RestoreStatus.InProgress;
            await SendRestoreProgressAsync(progressReporter, restore);

            await foreach (var (archiveName, stream) in backupProviderFactory.CurrentProvider.RestoreAsync(restore.TenantId, totalFiles => {
                restore.TotalFiles = totalFiles;
                // Send progress update with the total count
                SendRestoreProgressAsync(progressReporter, restore).Wait();
            }))
            {
                try
                {
                    if (restore.TokenSource.IsCancellationRequested)
                        break;

                    restore.CurrentFile = archiveName;
                    await SendRestoreProgressAsync(progressReporter, restore);

                var decryptedStream = encryptionServiceFactory.CurrentProvider!.Decrypt(stream, restore.Password);
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

                restore.FilesRestored++;
                await SendRestoreProgressAsync(progressReporter, restore);
            }
            catch (Exception ex)
            {
                // Log error but continue with next file
                Console.WriteLine($"Error restoring {archiveName}: {ex.Message}");
            }
        }

        restore.Status = TenantRestore.RestoreStatus.Finished;
        await SendRestoreProgressAsync(progressReporter, restore);
        StopTenant(restore.TenantId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Fatal error in restore: {ex.Message}");
            restore.Status = TenantRestore.RestoreStatus.Failed;
            restore.ErrorMessage = $"Restore failed: {ex.Message}";
            IBackupProgressReporter? errorReporter = null;
            using (var errorScope = _scopeFactory.CreateScope())
            {
                errorReporter = _progressReporterFactory?.Invoke(errorScope, restore.TenantId);
            }
            await SendRestoreProgressAsync(errorReporter, restore);
            StopTenant(restore.TenantId); // Ensure we remove from dictionary even on error
        }
    }

    private async Task SendRestoreProgressAsync(IBackupProgressReporter? progressReporter, TenantRestore restore)
    {
        if (progressReporter == null) return;

        await progressReporter.ReportRestoreProgressAsync(restore.TenantId, new
        {
            Status = restore.Status.ToString(),
            FilesRestored = restore.FilesRestored,
            TotalFiles = restore.TotalFiles,
            CurrentFile = restore.CurrentFile
        });
    }
}

#region Models
public class TenantRestore
{
    public enum RestoreStatus
    {
        NotStarted,
        InProgress,
        Finished,
        Failed
    }

    public required int TenantId { get; set; }
    public required string Password { get; set; }
    public string? Target { get; set; } // WebRTC target or null for default
    public RestoreStatus Status { get; set; }
    public required CancellationTokenSource TokenSource { get; set; }
    public int FilesRestored { get; set; }
    public int TotalFiles { get; set; }
    public string? CurrentFile { get; set; }
    public string? ErrorMessage { get; set; }
}

public class RestoreStatusResponse
{
    public bool IsRestoring { get; set; }
    public string Status { get; set; } = "NotStarted";
    public int FilesRestored { get; set; }
    public int TotalFiles { get; set; }
    public string? CurrentFile { get; set; }
    public string? ErrorMessage { get; set; }
}
#endregion
