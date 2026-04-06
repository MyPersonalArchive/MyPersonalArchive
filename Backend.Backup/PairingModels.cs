namespace Backend.Backup.Controllers;

public class PairingCodeResponse
{
    public required string Code { get; set; }
    public DateTime ExpiresAt { get; set; }
    public required string PeerId { get; set; }
}

public class UsePairingCodeRequest
{
    public required string Code { get; set; }
}

public class CompletePairingRequest
{
    public required string PeerId { get; set; }
    public string? PeerName { get; set; }
}

public class CompletePairingResponse
{
    public int DestinationId { get; set; }
    public required string Message { get; set; }
}

public class PairedPeerInfo
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Target { get; set; }
    public required string RemotePeerId { get; set; }
    public DateTime PairedAt { get; set; }
    public bool IsInitiator { get; set; }
    public required string Role { get; set; }
    public bool IsConnected { get; set; }
}

public class PairingResult
{
    public bool Success { get; set; }
    public required string PeerId { get; set; }
    public required string Target { get; set; }
    public required string Message { get; set; }
}

public class PairingStatusResponse
{
    public bool HasActiveSession { get; set; }
    public string? Code { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsExpired { get; set; }
    public bool IsConnected { get; set; }
    public string? RemotePeerId { get; set; }
}

public class RecoveryCodeResponse
{
    public required string Code { get; set; }
    public DateTime ExpiresAt { get; set; }
    public int TenantId { get; set; }
    public int AvailableBackupCount { get; set; }
}

public class UseRecoveryCodeRequest
{
    public required string Code { get; set; }
}
