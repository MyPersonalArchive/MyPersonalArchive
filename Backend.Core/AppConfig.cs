namespace Backend.Core;

public class AppConfig
{
	// public required string DatabaseFolder { get; set; }
    public required string BlobFolder { get; set; }
    public required string SettingsFolder { get; set; }
    public required string BackupFolder { get; set; }
    public required string TargetBackupSystemAddress { get; set; }
}