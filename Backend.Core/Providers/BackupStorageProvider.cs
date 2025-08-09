
using System.Text.Json;
using Backend.Core;
using Microsoft.Extensions.Options;

public interface IBackupStore
{
    Task SaveAsync(BackupPayload payload);
    Task<BackupPayload> GetAsync(Guid fileId);
}

public class BackupStorageProvider : IBackupStore
{
    private readonly string _storagePath;

    public BackupStorageProvider(IOptions<AppConfig> config)
    {
        _storagePath = config.Value.BackupFolder;
        Directory.CreateDirectory(_storagePath);
    }

    public Task SaveAsync(BackupPayload payload)
    {
        string filePath = Path.Combine(_storagePath, payload.File.FileId + ".json");
        string json = JsonSerializer.Serialize(payload);
        return File.WriteAllTextAsync(filePath, json);
    }

    public async Task<BackupPayload> GetAsync(Guid fileId)
    {
        string filePath = Path.Combine(_storagePath, fileId + ".json");
        if (!File.Exists(filePath))
            return null;

        string json = await File.ReadAllTextAsync(filePath);
        return JsonSerializer.Deserialize<BackupPayload>(json);
    }
}

public class BackupPayload
{
    public bool Replace { get; set; }

    public FileInfo File { get; set; }
    public EncryptionInfo Encryption { get; set; }

    public class FileInfo
    {
        public int TenantId { get; set; }
        public Guid FileId { get; set; }
        public int BlobId { get; set; }
        public DateTimeOffset UploadedAt { get; set; }
        public string MimeType { get; set; }
        public string UploadedBy { get; set; }
        public string FileName { get; set; }
    }

    public class EncryptionInfo
    {
        public string CipherText { get; set; }
        public string EncryptedKey { get; set; }
        public string IV { get; set; }
        public string Tag { get; set; }
    }
}

