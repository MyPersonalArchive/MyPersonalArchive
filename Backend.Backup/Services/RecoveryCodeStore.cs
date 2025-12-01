using System.Text.Json;
using Backend.Core;
using Microsoft.Extensions.Options;

namespace Backend.Backup.Services;

public class RecoveryCode
{
    public string Code { get; set; } = "";
    public int TenantId { get; set; }
    public string LocalPeerId { get; set; } = "";
    public DateTime GeneratedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public List<string> AvailableBackups { get; set; } = new();
}

public class RecoveryCodeStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true
    };

    public RecoveryCodeStore(IOptions<AppConfig> config)
    {
        var backupFolder = config.Value.BackupFolder;
        Directory.CreateDirectory(backupFolder);
        _filePath = Path.Combine(backupFolder, "recovery-codes.json");
    }

    public async Task<List<RecoveryCode>> GetAllAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
                return new List<RecoveryCode>();

            var json = await File.ReadAllTextAsync(_filePath);
            return JsonSerializer.Deserialize<List<RecoveryCode>>(json, _jsonOptions) ?? new List<RecoveryCode>();
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<RecoveryCode?> GetByCodeAsync(string code)
    {
        var codes = await GetAllAsync();
        return codes.FirstOrDefault(c => 
            c.Code == code && 
            !c.IsUsed && 
            c.ExpiresAt > DateTime.UtcNow);
    }

    public async Task SaveAsync(RecoveryCode recoveryCode)
    {
        await _fileLock.WaitAsync();
        try
        {
            List<RecoveryCode> codes;
            if (File.Exists(_filePath))
            {
                var json = await File.ReadAllTextAsync(_filePath);
                codes = JsonSerializer.Deserialize<List<RecoveryCode>>(json, _jsonOptions) ?? new List<RecoveryCode>();
            }
            else
            {
                codes = new List<RecoveryCode>();
            }
            
            // Remove existing code with same code string
            codes.RemoveAll(c => c.Code == recoveryCode.Code);
            
            // Add new code
            codes.Add(recoveryCode);
            
            // Clean up expired codes
            codes.RemoveAll(c => c.ExpiresAt < DateTime.UtcNow.AddDays(-7)); // Keep for 7 days after expiry
            
            // Save to file
            var jsonOut = JsonSerializer.Serialize(codes, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[RecoveryCodeStore] Error saving recovery code: {ex.Message}");
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task MarkAsUsedAsync(string code)
    {
        await _fileLock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
                return;
            
            var json = await File.ReadAllTextAsync(_filePath);
            var codes = JsonSerializer.Deserialize<List<RecoveryCode>>(json, _jsonOptions) ?? new List<RecoveryCode>();
            
            var recoveryCode = codes.FirstOrDefault(c => c.Code == code);
            if (recoveryCode != null)
            {
                recoveryCode.IsUsed = true;
            }
            
            var jsonOut = JsonSerializer.Serialize(codes, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        finally
        {
            _fileLock.Release();
        }
    }
}
