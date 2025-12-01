namespace Backend.Backup;

public interface IBackupProgressReporter
{
    Task ReportProgressAsync(BackupLog log, int current, int total);
    Task ReportCompletedAsync();
    Task ReportErrorAsync(string error, string? target = null);
    Task ReportRestoreProgressAsync(int tenantId, object progressData);
}
