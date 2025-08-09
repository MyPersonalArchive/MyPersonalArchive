
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

    public BackupClient(CipherService cypherService, IOptions<AppConfig> config)
    {
        _cypherService = cypherService;

        _httpClient = new HttpClient
        {
            //Address should probably be configureable from the client. Maybe it should be possible to add multiple mirroring servers etc...
            BaseAddress = new Uri(config.Value.TargetBackupSystemAddress)
        };
    }

    public async Task Backup(Stream stream, int tenantId, int blobId, Guid fileId, FileMetadata metadata)
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

        var response = await _httpClient.PostAsync("/api/Backup/store", content);

        if (!response.IsSuccessStatusCode)
        {
            //Log or something????
        }
        else
        {
            await Task.Delay(5000);
            await Restore(tenantId, fileId);
        }
    }

    public async Task Restore(int tenantId, Guid fileId)
    {
        var response = await _httpClient.GetAsync($"/api/backup/restore?tenantId={tenantId}&fileId={fileId}");
        var payload = await response.Content.ReadFromJsonAsync<BackupPayload>();
        var decryptedFile = _cypherService.DecryptFile(Encoding.UTF8.GetBytes(payload.Encryption.CipherText),
                                    Encoding.UTF8.GetBytes(payload.Encryption.EncryptedKey),
                                    Encoding.UTF8.GetBytes(payload.Encryption.IV),
                                    Encoding.UTF8.GetBytes(payload.Encryption.Tag));

        
        
    }
}