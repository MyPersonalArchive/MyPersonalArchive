using Backend.Backup.Providers;
using Backend.Backup.Services;
using Backend.Crypto;
using Backend.Core;
using Backend.Core.Providers;

namespace Backend.Backup;

public class BackupProviderFactory
{
    public IBackupProvider? CurrentProvider { get; private set; }
    private readonly string? _signalingServerUrl;
    private readonly List<string> _iceServers;
    private readonly WebRTCConnectionPool? _connectionPool;

    public BackupProviderFactory(string? signalingServerUrl = null, List<string>? iceServers = null, WebRTCConnectionPool? connectionPool = null)
    {
        _signalingServerUrl = signalingServerUrl;
        _iceServers = iceServers ?? new List<string>();
        _connectionPool = connectionPool;
        SetProvider("BuddyTarget");
    }

    public void SetProvider(string providerName)
    {
        switch (providerName)
        {
            case "BuddyTarget":
                CurrentProvider = new BuddyTargetBackupProvider();
                break;
            case "WebRTC":
                if (string.IsNullOrEmpty(_signalingServerUrl))
                    throw new InvalidOperationException("Signaling server URL not configured for WebRTC");
                if (_connectionPool == null)
                    throw new InvalidOperationException("WebRTC connection pool not configured");
                CurrentProvider = new WebRTCBackupProvider(_connectionPool);
                break;
            default:
                throw new NotSupportedException($"Provider {providerName} is not supported");
        }

        Console.WriteLine($"Backup provider set to {providerName}");
    }
}

public class EncryptionProviderFactory
{
    public IEncryptionService? CurrentProvider { get; private set; }

    public EncryptionProviderFactory()
    {
        SetProvider("None");
    }

    public void SetProvider(string providerName)
    {
        switch (providerName)
        {
            case "None":
                CurrentProvider = new NoEncryptionService();
                break;
            case "AesOpenssl":
                CurrentProvider = new OpenSslAes256Cbc();
                break;
            default:
                throw new NotSupportedException($"Provider {providerName} is not supported");
        }

        Console.WriteLine($"Encryption provider set to {providerName}");
    }
}

public class NoEncryptionService : IEncryptionService
{
    public MemoryStream Encrypt(Stream inputStream, string password)
    {
        return (MemoryStream)inputStream;
    }

    public MemoryStream Decrypt(Stream encryptedStream, string password)
    {
        return (MemoryStream)encryptedStream;
    }
}
