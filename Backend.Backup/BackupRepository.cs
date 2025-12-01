using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;

namespace Backend.Backup;

public class BackupRepository(MpaDbContext dbContext)
{
	public async Task<BackupDestination> GetOrCreateDestinationAsync(
        int tenantId, string providerName, string target)
    {
        var title = $"{providerName}:{target}";
        var existing = await dbContext.BackupDestinations
            .FirstOrDefaultAsync(bd => bd.TenantId == tenantId && bd.Title == title);

        if (existing != null)
            return existing;

        var metadata = new System.Text.Json.Nodes.JsonObject
        {
            ["ProviderType"] = providerName,
            ["Target"] = target,
            ["CreatedAt"] = DateTimeOffset.UtcNow.ToString("o")
        };

        var destination = new BackupDestination
        {
            TenantId = tenantId,
            Title = title,
            Metadata = metadata
        };

        dbContext.BackupDestinations.Add(destination);
        await dbContext.SaveChangesAsync();

        return destination;
    }

    public async Task<BackupHistory> CreateHistoryAsync(int backupDestinationId)
    {
        var history = new BackupHistory
        {
            BackupDestinationId = backupDestinationId,
            StartedAt = DateTimeOffset.UtcNow,
            Status = BackupHistory.BackupStatus.Started,
            LogPath = ""
        };

        dbContext.BackupHistory.Add(history);
        await dbContext.SaveChangesAsync();

        return history;
    }

    public async Task UpdateHistoryStatusAsync(
        BackupHistory history, 
        BackupHistory.BackupStatus status, 
        string? logPath = null)
    {
        history.Status = status;
        history.CompletedAt = DateTimeOffset.UtcNow;
        
        if (logPath != null)
            history.LogPath = logPath;

        await dbContext.SaveChangesAsync();
    }

    public async Task<List<ArchiveItem>> GetItemsToBackupAsync(int tenantId)
    {
        return await dbContext.ArchiveItems
            .Where(ai => ai.TenantId == tenantId)
            .Include(ai => ai.Blobs)
            .ToListAsync();
    }
}
