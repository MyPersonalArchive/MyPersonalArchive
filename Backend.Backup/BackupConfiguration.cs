namespace Backend.Backup;

public class BackupConfiguration
{
    public const string SectionName = "Backup";
    
    public required string BackupFolder { get; set; }
    public TimeSpan DefaultInterval { get; set; } = TimeSpan.FromHours(24);
    public int MaxConcurrentBackups { get; set; } = 3;
    public bool EnableProgressReporting { get; set; } = true;
}
