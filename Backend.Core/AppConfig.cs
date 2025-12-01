namespace Backend.Core;

public class AppConfig
{
	// public required string DatabaseFolder { get; set; }
    public required string BlobFolder { get; set; }
    public required string SettingsFolder { get; set; }
    public required string BackupFolder { get; set; }
    public required string TargetBackupSystemAddress { get; set; }
    public string? SignalingServerUrl { get; set; }
    public List<IceServerConfig> IceServers { get; set; } = new();
}

public class IceServerConfig
{
    public required string Urls { get; set; }
    public string? Username { get; set; }
    public string? Credential { get; set; }
}