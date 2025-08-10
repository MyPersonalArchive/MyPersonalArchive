
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Backend.Core;
using Backend.Core.Providers;
using Microsoft.Extensions.Options;

public class BackupClient
{
    private readonly CipherService _cypherService;
    private readonly HttpClient _httpClient;
    private readonly string _blobFolder;
    private readonly AmbientDataResolver _resolver;
    private readonly IFileStorageProvider _fileprovider;

    public BackupClient(CipherService cypherService, IOptions<AppConfig> config, AmbientDataResolver resolver, IFileStorageProvider fileprovider)
    {
        _cypherService = cypherService;
        _resolver = resolver;
        _fileprovider = fileprovider;

        _httpClient = new HttpClient
        {
            //Address should probably be configureable from the client. Maybe it should be possible to add multiple mirroring servers etc...
            BaseAddress = new Uri(config.Value.TargetBackupSystemAddress)
        };
    }

    #region Backup

    public async Task BackupBlob(Stream stream, int tenantId, int blobId, Guid fileId, FileMetadata metadata)
    {
        var (cipherText, encryptedKey, iv, tag) = _cypherService.EncryptFile(stream);

        var payload = new BackupPayload
        {
            Encryption = new BackupPayload.EncryptionInfo
            {
                CipherText = Convert.ToBase64String(cipherText),
                EncryptedKey = Convert.ToBase64String(encryptedKey),
                IV = Convert.ToBase64String(iv),
                Tag = Convert.ToBase64String(tag)
            },
            File = new BackupPayload.FileInfo
            {
                FileId = fileId,
                FileName = metadata.OriginalFilename,
                BlobId = blobId,
                MimeType = metadata.MimeType,
                TenantId = tenantId,
                UploadedAt = metadata.UploadedAt,
                UploadedBy = metadata.UploadedBy
            }
        };

        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload));
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        var response = await _httpClient.PostAsync("/api/Backup/storeblob", content);

        if (!response.IsSuccessStatusCode)
        {
            //Log or something????
        }
    }

    public async Task BackupTableData(string name, int tenantId, string json)
    {
        using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
        var (cipherText, encryptedKey, iv, tag) = _cypherService.EncryptFile(stream);

        var payload = new BackupTableData
        {
            Name = name,
            TenantId = tenantId,
            Encryption = new BackupPayload.EncryptionInfo
            {
                CipherText = Convert.ToBase64String(cipherText),
                EncryptedKey = Convert.ToBase64String(encryptedKey),
                IV = Convert.ToBase64String(iv),
                Tag = Convert.ToBase64String(tag)
            }
        };

        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload));
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        var response = await _httpClient.PostAsync("/api/Backup/storetabledataa", content);

        if (!response.IsSuccessStatusCode)
        {
            //Log or something????
        }
    }

    #endregion

    #region Restore
    public async Task RestoreBlobAsJson(int tenantId, Guid fileId)
    {
        var response = await _httpClient.GetAsync($"/api/backup/restoreblob?tenantId={tenantId}&fileId={fileId}");
        var payload = await response.Content.ReadFromJsonAsync<BackupPayload>();
        var decryptedPayload = _cypherService.DecryptFile(Convert.FromBase64String(payload.Encryption.CipherText),
                                    Convert.FromBase64String(payload.Encryption.EncryptedKey),
                                    Convert.FromBase64String(payload.Encryption.IV),
                                    Convert.FromBase64String(payload.Encryption.Tag));

        using var stream = new MemoryStream(decryptedPayload);
        await _fileprovider.Store(payload.File.FileName, payload.File.MimeType, stream);

        Console.WriteLine($"Restored blob with id {fileId} for tenant {tenantId}");
    }


    public async Task RestoreTableDataAsJson(string name, int tenantId)
    {
        var response = await _httpClient.GetAsync($"/api/backup/restoretabledata?tenantId={tenantId}&name={name}");
        var payload = await response.Content.ReadFromJsonAsync<BackupTableData>();
        var decryptedPayload = _cypherService.DecryptFile(Convert.FromBase64String(payload.Encryption.CipherText),
                                    Convert.FromBase64String(payload.Encryption.EncryptedKey),
                                    Convert.FromBase64String(payload.Encryption.IV),
                                    Convert.FromBase64String(payload.Encryption.Tag));

        Console.WriteLine($"Restored table data {name} for tenant {tenantId}");
    }

    #endregion
}

public class BackupTableData
{
    public string Name { get; set; }
    public int TenantId { get; set; }
    public BackupPayload.EncryptionInfo Encryption { get; set; }
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