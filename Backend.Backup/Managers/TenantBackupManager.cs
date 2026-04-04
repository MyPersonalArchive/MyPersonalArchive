using System.Collections.Concurrent;
using Backend.Backup.Providers;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Backend.Backup;

public class TenantBackupManager
{
    private readonly ConcurrentDictionary<int, TenantBackup> _backupTenants = new();
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly BackupConfiguration _config;

    public TenantBackupManager(
        IServiceScopeFactory scopeFactory,
        IOptions<BackupConfiguration> config)
    {
        _scopeFactory = scopeFactory;
        _config = config.Value;
    }

    public async Task<bool> StartTenantAsync(string target, int tenantId, string password)
    {
        if (string.IsNullOrWhiteSpace(target))
            throw new ArgumentException("Target cannot be empty", nameof(target));

        if (_backupTenants.ContainsKey(tenantId))
            return false;

        // Load interval from config file
        var interval = await GetBackupIntervalAsync(tenantId);

        var backup = new TenantBackup
        {
            Target = target,
            TenantId = tenantId,
            Password = password,
            LastBackupTime = null,
            NextBackupTime = null,
            TokenSource = new CancellationTokenSource(),
            Interval = interval
        };

        _backupTenants[tenantId] = backup;

        _ = Task.Run(() => RunBackupAsync(backup));

        return true;
    }

    public bool StartTenant(string target, int tenantId, string password)
    {
        return StartTenantAsync(target, tenantId, password).GetAwaiter().GetResult();
    }

    public async Task<bool> StopTenantAsync(int tenantId)
    {
        if (!_backupTenants.TryRemove(tenantId, out var backup))
            return false;

        backup.TokenSource.Cancel();
        backup.TokenSource.Dispose();

        return true;
    }

    public bool StopTenant(int tenantId)
    {
        return StopTenantAsync(tenantId).GetAwaiter().GetResult();
    }

    public TenantBackup? GetBackupInformation(int tenantId)
    {
        return _backupTenants.TryGetValue(tenantId, out var backup) ? backup : null;
    }

    private async Task<TimeSpan> GetBackupIntervalAsync(int tenantId)
    {
        var configFilePath = Path.Combine(_config.BackupFolder, $"backup-config-tenant-{tenantId}.json");
        
        if (!File.Exists(configFilePath))
        {
            return _config.DefaultInterval; // Return default from BackupConfiguration
        }

        try
        {
            var json = await File.ReadAllTextAsync(configFilePath);
            var config = JsonConvert.DeserializeObject<TenantBackupConfigJson>(json);
            return TimeSpan.FromMinutes(config?.IntervalMinutes ?? 1440); // Default to 24 hours
        }
        catch
        {
            return _config.DefaultInterval;
        }
    }

    private async Task RunBackupAsync(TenantBackup backup)
    {
        try
        {
            while (!backup.TokenSource.IsCancellationRequested)
            {
                backup.Status = TenantBackup.BackupStatus.Running;
                
                try
                {
                    await ExecuteSingleBackupCycleAsync(backup);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error during backup for tenant {backup.TenantId}: {ex.Message}");
                    
                    // Report error with correct tenant context
                    if (_config.EnableProgressReporting)
                    {
                        using var errorScope = _scopeFactory.CreateScope();
                        var errorReporter = CreateProgressReporter(errorScope, backup.TenantId);
                        if (errorReporter != null)
                            await errorReporter.ReportErrorAsync(ex.Message, backup.Target);
                    }
                }
                
                backup.LastBackupTime = DateTime.UtcNow;
                backup.NextBackupTime = backup.LastBackupTime + backup.Interval;
                backup.Status = TenantBackup.BackupStatus.Waiting;
                
                await Task.Delay(backup.Interval, backup.TokenSource.Token);
            }
        }
        catch (Exception)
        {
            //Log somewhere?
        }
    }

    private async Task ExecuteSingleBackupCycleAsync(TenantBackup backup)
    {
        using var scope = _scopeFactory.CreateScope();
        
        var dbContext = ActivatorUtilities.CreateInstance<MpaDbContext>(
            scope.ServiceProvider,
            new StaticAmbientDataResolver(backup.TenantId)
        );

        var repository = new BackupRepository(dbContext);
        var backupService = new BackupService(scope, backup.TenantId);
        var progressReporter = CreateProgressReporter(scope, backup.TenantId);
        var backupProviderFactory = scope.ServiceProvider.GetService<BackupProviderFactory>()!;

        await backupProviderFactory.CurrentProvider!.Connect(backup.Target);

        var backupDestination = await repository.GetOrCreateDestinationAsync(
            backup.TenantId, backupProviderFactory.CurrentProvider!.Name, backup.Target);

        var backupHistory = await repository.CreateHistoryAsync(backupDestination.Id);

        var itemsToBackup = await GetFilteredItemsAsync(repository, backup.TenantId);
        var totalItems = itemsToBackup.Count;
        var backedUpItems = 0;
        var backupLogs = new List<BackupLog>();
        bool hasErrors = false;

        try
        {
            await repository.UpdateHistoryStatusAsync(backupHistory, BackupHistory.BackupStatus.Running);

            foreach (var archiveItem in itemsToBackup)
            {
                if (backup.TokenSource.IsCancellationRequested)
                    break;

                BackupLog? backupLog = null;
                try
                {
                    backupLog = CreateBackupLog(backup, archiveItem, backupProviderFactory.CurrentProvider);
                    backupLogs.Add(backupLog);
                    
                    var result = await backupService.BackupArchiveItemAsync(archiveItem, backup.Target, backup.Password, backup.TokenSource.Token);
                    
                    if (result.Success)
                    {
                        UpdateBackupLogSuccess(backupLog, result.FileSizeBytes);
                        backedUpItems++;
                    }
                    else
                    {
                        UpdateBackupLogFailure(backupLog, result.ErrorMessage ?? "Unknown error");
                        hasErrors = true;
                    }
                }
                catch (Exception itemEx)
                {
                    if (backupLog != null)
                    {
                        UpdateBackupLogFailure(backupLog, itemEx.Message);
                    }
                    hasErrors = true;
                }
                
                if (_config.EnableProgressReporting && progressReporter != null && backupLog != null)
                {
                    await progressReporter.ReportProgressAsync(backupLog, backedUpItems, totalItems);
                }
            }

            var logFileService = scope.ServiceProvider.GetRequiredService<BackupLogFileService>();
            
            // Assign sequential IDs to logs before saving
            for (int i = 0; i < backupLogs.Count; i++)
            {
                backupLogs[i].Id = i + 1;
            }
            
            var logPath = await logFileService.WriteLogsAsync(backup.TenantId, backupLogs);

            var finalStatus = backup.TokenSource.IsCancellationRequested || hasErrors
                ? BackupHistory.BackupStatus.Failed
                : BackupHistory.BackupStatus.Completed;

            await repository.UpdateHistoryStatusAsync(backupHistory, finalStatus, logPath);
        }
        catch (Exception)
        {
            await repository.UpdateHistoryStatusAsync(backupHistory, BackupHistory.BackupStatus.Failed);
            throw;
        }

        if (_config.EnableProgressReporting && progressReporter != null)
        {
            await progressReporter.ReportCompletedAsync();
        }
    }

    private async Task<List<ArchiveItem>> GetFilteredItemsAsync(BackupRepository repository, int tenantId)
    {
        var allItems = await repository.GetItemsToBackupAsync(tenantId);
        
        using var scope = _scopeFactory.CreateScope();
        var logFileService = scope.ServiceProvider.GetRequiredService<BackupLogFileService>();
        var successfulBackups = await logFileService.ReadAllSuccessfulLogsAsync(tenantId);

        return allItems
            .Where(item => !successfulBackups.Any(log => 
                log.ItemType == "ArchiveItem" &&
                log.ItemId == item.Id &&
                log.ItemLastUpdated == item.LastUpdated &&
                log.Status == BackupLog.BackupStatus.Success))
            .ToList();
    }

    private BackupLog CreateBackupLog(TenantBackup backup, ArchiveItem archiveItem, IBackupProvider backupProvider)
    {
        var backupFileName = $"ArchiveItem_{archiveItem.Id}.zip.enc";
        return new BackupLog
        {
            ItemType = "ArchiveItem",
            ItemId = archiveItem.Id,
            ItemName = archiveItem.Title ?? $"ArchiveItem_{archiveItem.Id}",
            StartedAt = DateTimeOffset.UtcNow,
            ItemLastUpdated = archiveItem.LastUpdated,
            Status = BackupLog.BackupStatus.InProgress,
            BackupFileName = backupFileName,
            TargetSystem = backup.Target,
            TargetType = backupProvider.Name
        };
    }

    private void UpdateBackupLogSuccess(BackupLog backupLog, long fileSizeBytes)
    {
        backupLog.CompletedAt = DateTime.UtcNow;
        backupLog.Status = BackupLog.BackupStatus.Success;
        backupLog.FileSizeBytes = fileSizeBytes;
    }

    private void UpdateBackupLogFailure(BackupLog backupLog, string errorMessage)
    {
        backupLog.CompletedAt = DateTime.UtcNow;
        backupLog.Status = BackupLog.BackupStatus.Failed;
        backupLog.ErrorMessage = errorMessage;
    }

    private IBackupProgressReporter? CreateProgressReporter(IServiceScope scope, int tenantId)
    {
        if (!_config.EnableProgressReporting)
            return null;

        // Get the factory from DI and create reporter with correct tenantId
        var factory = scope.ServiceProvider.GetService<Func<IServiceScope, int, IBackupProgressReporter>>();
        return factory?.Invoke(scope, tenantId);
    }

    public async Task<List<string>> DeleteRemoteBackupsAsync(int tenantId, string target)
    {
        using var scope = _scopeFactory.CreateScope();
        
        var backupProviderFactory = scope.ServiceProvider.GetService<BackupProviderFactory>()!;
        
        await backupProviderFactory.CurrentProvider!.Connect(target);
        
        return await backupProviderFactory.CurrentProvider!.DeleteBackupsAsync(tenantId);
    }
}

#region Models
public class TenantBackup
{
    public enum BackupStatus
    {
        NotStarted = 0,
        Running = 1,
        Waiting = 2
    }

    public required int TenantId { get; set; }
    public required string Password { get; set; }
    public DateTime? LastBackupTime { get; set; }
    public DateTime? NextBackupTime { get; set; }
    public required CancellationTokenSource TokenSource { get; set; }
    public required TimeSpan Interval { get; set; }
    public BackupStatus Status { get; set; } = BackupStatus.NotStarted;
    public required string Target { get; set; }
}

public class TenantBackupConfigJson
{
    public int TenantId { get; set; }
    public int IntervalMinutes { get; set; }
    public DateTime LastUpdated { get; set; }
}
#endregion
