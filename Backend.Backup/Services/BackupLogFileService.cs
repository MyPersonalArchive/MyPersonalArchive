using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Backend.Backup;

public class BackupLogFileService(IOptions<BackupConfiguration> config)
{
	public async Task<string> WriteLogsAsync(int tenantId, List<BackupLog> logs)
    {
        var tenantFolder = GetTenantFolder(tenantId);
        Directory.CreateDirectory(tenantFolder);
        
        var fileName = $"{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
        var filePath = Path.Combine(tenantFolder, fileName);
        var json = JsonConvert.SerializeObject(logs, Formatting.Indented);
        
        await File.WriteAllTextAsync(filePath, json);
        return filePath;
    }

    public async Task<List<BackupLog>> ReadLogsByTimestampAsync(int tenantId, string timestamp)
    {
        var filePath = Path.Combine(GetTenantFolder(tenantId), $"{timestamp}.json");
        
        if (!File.Exists(filePath))
            return new List<BackupLog>();

        var json = await File.ReadAllTextAsync(filePath);
        return JsonConvert.DeserializeObject<List<BackupLog>>(json) ?? new List<BackupLog>();
    }

    public async Task<List<BackupLog>> ReadLatestLogsAsync(int tenantId)
    {
        var latestFile = GetLogFiles(tenantId).FirstOrDefault();
        
        if (latestFile == null)
            return new List<BackupLog>();

        var json = await File.ReadAllTextAsync(latestFile);
        return JsonConvert.DeserializeObject<List<BackupLog>>(json) ?? new List<BackupLog>();
    }

    public async Task<List<BackupLog>> ReadAllSuccessfulLogsAsync(int tenantId)
    {
        var allLogs = new List<BackupLog>();

        foreach (var logFile in GetLogFiles(tenantId))
        {
            try
            {
                var json = await File.ReadAllTextAsync(logFile);
                var logs = JsonConvert.DeserializeObject<List<BackupLog>>(json);
                
                if (logs != null)
                    allLogs.AddRange(logs.Where(l => l.Status == BackupLog.BackupStatus.Success));
            }
            catch { /* Skip corrupted files */ }
        }

        return allLogs;
    }

    public List<BackupLogHistoryInfo> GetBackupLogHistory(int tenantId, int limit = 10)
    {
        var logHistory = new List<BackupLogHistoryInfo>();

        foreach (var logFile in GetLogFiles(tenantId).Take(limit))
        {
            try
            {
                var fileName = Path.GetFileNameWithoutExtension(logFile);
                var fileInfo = new FileInfo(logFile);
                
                if (!DateTime.TryParseExact(fileName, "yyyyMMdd_HHmmss", 
                    System.Globalization.CultureInfo.InvariantCulture, 
                    System.Globalization.DateTimeStyles.AssumeUniversal, 
                    out var timestamp))
                    continue;

                var json = File.ReadAllText(logFile);
                var logs = JsonConvert.DeserializeObject<List<BackupLog>>(json);
                
                if (logs != null)
                {
                    logHistory.Add(new BackupLogHistoryInfo
                    {
                        Timestamp = fileName,
                        RunDate = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc),
                        TotalItems = logs.Count,
                        SuccessfulItems = logs.Count(l => l.Status == BackupLog.BackupStatus.Success),
                        FailedItems = logs.Count(l => l.Status == BackupLog.BackupStatus.Failed),
                        FileSizeKB = fileInfo.Length / 1024
                    });
                }
            }
            catch { /* Skip corrupted files */ }
        }

        return logHistory;
    }

    private string GetTenantFolder(int tenantId) 
        => Path.Combine(config.Value.BackupFolder, tenantId.ToString());

    private IEnumerable<string> GetLogFiles(int tenantId)
    {
        var folder = GetTenantFolder(tenantId);
        
        if (!Directory.Exists(folder))
            return Enumerable.Empty<string>();

        return Directory.GetFiles(folder, "*.json").OrderByDescending(f => f);
    }
}

#region Models
public class BackupLog
{
    public int Id { get; set; }
    public required string ItemType { get; set; }
    public int ItemId { get; set; }
    public required string ItemName { get; set; }
    public required string TargetSystem { get; set; }
    public required string TargetType { get; set; }
    public DateTimeOffset ItemLastUpdated { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public BackupStatus Status { get; set; }
    public string? ErrorMessage { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? BackupFileName { get; set; }

    public enum BackupStatus
    {
        InProgress = 1,
        Success = 2,
        Failed = 3
    }
}

public class BackupLogHistoryInfo
{
    public required string Timestamp { get; set; }
    public DateTime RunDate { get; set; }
    public int TotalItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public long FileSizeKB { get; set; }
}
#endregion
