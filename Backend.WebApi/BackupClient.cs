
using System.Collections;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Backend.Core;
using Backend.Core.Providers;
using Backend.DbModel.Database;
using Backend.DbModel.Database.EntityModels;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

public class BackupClient
{
    private readonly CipherService _cypherService;
    private readonly HttpClient _httpClient;
    private readonly IFileStorageProvider _fileprovider;
    private readonly MpaDbContext _dbContext;

    public BackupClient(CipherService cypherService, IOptions<AppConfig> config, IFileStorageProvider fileprovider, MpaDbContext dbContext)
    {
        _cypherService = cypherService;
        _fileprovider = fileprovider;
        _dbContext = dbContext;

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
    public async Task RestoreBlob(int tenantId, Guid fileId)
    {
        var response = await _httpClient.GetAsync($"/api/backup/restoreblob?tenantId={tenantId}&fileId={fileId}");
        var payload = await response.Content.ReadFromJsonAsync<BackupPayload>();
        var decryptedPayload = _cypherService.DecryptFile(Convert.FromBase64String(payload.Encryption.CipherText),
                                    Convert.FromBase64String(payload.Encryption.EncryptedKey),
                                    Convert.FromBase64String(payload.Encryption.IV),
                                    Convert.FromBase64String(payload.Encryption.Tag));

        using var stream = new MemoryStream(decryptedPayload);
        var filePath = await _fileprovider.Store(payload.File.FileName, payload.File.MimeType, stream);

        //Also update blobs table
        var blob = _dbContext.Blobs.Find(payload.File.BlobId);
        if (blob == null)
        {
            _dbContext.Blobs.Add(new Blob
            {
                Id = payload.File.BlobId,
                TenantId = tenantId,
                ArchiveItem = _dbContext.ArchiveItems.Find(payload.File.ArchiveItemId),
                FileHash = _fileprovider.ComputeSha256Hash(stream),
                MimeType = payload.File.MimeType,
                OriginalFilename = payload.File.FileName,
                PageCount = PreviewGenerator.GetDocumentPageCount(payload.File.MimeType, stream),
                FileSize = stream.Length,
                UploadedAt = payload.File.UploadedAt,
                UploadedByUsername = payload.File.UploadedBy,
                StoreRoot = StoreRoot.FileStorage.ToString(),
                PathInStore = filePath
            });
        }
        await _dbContext.SaveChangesAsync();

        Console.WriteLine($"Restored blob with id {fileId} for tenant {tenantId}");
    }


    public async Task RestoreTableData(string name, int tenantId)
    {
        var response = await _httpClient.GetAsync($"/api/backup/restoretabledata?tenantId={tenantId}&name={name}");
        var payload = await response.Content.ReadFromJsonAsync<BackupTableData>();
        var decryptedPayload = _cypherService.DecryptFile(Convert.FromBase64String(payload.Encryption.CipherText),
                                    Convert.FromBase64String(payload.Encryption.EncryptedKey),
                                    Convert.FromBase64String(payload.Encryption.IV),
                                    Convert.FromBase64String(payload.Encryption.Tag));

        RestoreTable(_dbContext, name, Encoding.UTF8.GetString(decryptedPayload));

        Console.WriteLine($"Restored table data {name} for tenant {tenantId}");
    }

    #endregion
    
    private void RestoreTable(MpaDbContext dbContext, string tableName, string json)
    {
        var entityType = dbContext.Model.GetEntityTypes()
        .FirstOrDefault(e => e.GetTableName().Equals(tableName, StringComparison.OrdinalIgnoreCase));

        if (entityType == null)
            throw new ArgumentException($"No entity found for table '{tableName}'");

        var clrType = entityType.ClrType;

        var keyProperty = entityType.FindPrimaryKey().Properties.First();
        var keyName = keyProperty.Name;

        var listType = typeof(List<>).MakeGenericType(clrType);
        var items = (IList)JsonConvert.DeserializeObject(json, listType);

        foreach (var item in items)
        {
            var keyValue = clrType.GetProperty(keyName).GetValue(item);

            // Check if entity exists
            var existing = dbContext.Find(clrType, keyValue);

            if (existing == null)
            {
                // Insert new
                dbContext.Add(item);
            }
            else
            {
                // Update existing
                dbContext.Entry(existing).CurrentValues.SetValues(item);
            }
        }

        dbContext.SaveChanges();
    }
}