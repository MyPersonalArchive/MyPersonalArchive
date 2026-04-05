namespace Backend.Core;

public class AppConfig
{
	// public required string DatabaseFolder { get; set; }
    public required string BlobFolder { get; set; }
    public required string SettingsFolder { get; set; }
    public required string BackupFolder { get; set; }
    public required string TargetBackupSystemAddress { get; set; }
    public string? SignalingServerUrl { get; set; }
    public List<string> IceServers { get; set; } = new();
    public string? TurnUsername { get; set; }
    public string? TurnCredential { get; set; }
}