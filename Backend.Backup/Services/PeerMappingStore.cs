using System.Text.Json;
using System.Text.Json.Serialization;
using Backend.Core;
using Microsoft.Extensions.Options;

namespace Backend.Backup.Services;

public enum PairingRole
{
	Source,      // I backup TO them (I send my data to remote peer)
	Destination  // They backup TO me (I receive their data)
}

public class PeerMapping
{
	public string LocalPeerId { get; set; } = "";
	public string RemotePeerId { get; set; } = "";
	public int TenantId { get; set; }
	public int DestinationId { get; set; }
	public DateTime PairedAt { get; set; }
	
	[JsonConverter(typeof(JsonStringEnumConverter))]
	public PairingRole Role { get; set; } = PairingRole.Source; // Default for backward compatibility
}

public class PeerMappingData
{
	public Dictionary<int, string> LocalPeerIds { get; set; } = new();
	public List<PeerMapping> Mappings { get; set; } = new();
}

public class PeerMappingStore
{
    private readonly string _filePath;
	
	// To ensure thread-safe file access, multiple users must not read/write simultaneously
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public PeerMappingStore(IOptions<AppConfig> config)
    {
        var backupFolder = config.Value.BackupFolder;
        Directory.CreateDirectory(backupFolder);
        _filePath = Path.Combine(backupFolder, "peer-mappings.json");
    }

    public async Task<List<PeerMapping>> GetAllAsync()
    {
        await _fileLock.WaitAsync();
        try
        {
            if (!File.Exists(_filePath))
                return [];

            var json = await File.ReadAllTextAsync(_filePath);
            
			var data = JsonSerializer.Deserialize<PeerMappingData>(json, _jsonOptions);
			return data?.Mappings ?? [];
        }
        finally
        {
            _fileLock.Release();
        }
    }

    private async Task<PeerMappingData> GetDataAsync()
    {
        if (!File.Exists(_filePath))
            return new PeerMappingData();

        var json = await File.ReadAllTextAsync(_filePath);
        
		return JsonSerializer.Deserialize<PeerMappingData>(json, _jsonOptions) ?? new PeerMappingData();
    }

    public async Task<string?> GetLocalPeerIdAsync(int tenantId)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            return data.LocalPeerIds.TryGetValue(tenantId, out var peerId) ? peerId : null;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task SetLocalPeerIdAsync(int tenantId, string peerId)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            data.LocalPeerIds[tenantId] = peerId;
            
            EnsureDirectoryExists();
            
            var jsonOut = JsonSerializer.Serialize(data, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<PeerMapping?> GetByLocalPeerIdAsync(string localPeerId)
    {
        var mappings = await GetAllAsync();
        return mappings.FirstOrDefault(m => m.LocalPeerId == localPeerId);
    }

    public async Task<PeerMapping?> GetByDestinationIdAsync(int destinationId)
    {
        var mappings = await GetAllAsync();
        return mappings.FirstOrDefault(m => m.DestinationId == destinationId);
    }

    public async Task<PeerMapping?> GetByRemotePeerIdAsync(string remotePeerId, string localPeerId)
    {
        var mappings = await GetAllAsync();
        return mappings.FirstOrDefault(m => m.RemotePeerId == remotePeerId && m.LocalPeerId == localPeerId);
    }

    public async Task<PeerMapping?> GetByTenantAsync(int tenantId)
    {
        var mappings = await GetAllAsync();
        return mappings.FirstOrDefault(m => m.TenantId == tenantId);
    }

    public async Task UpdateAsync(PeerMapping mapping)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            
            // Find and update existing mapping
            var index = data.Mappings.FindIndex(m => m.DestinationId == mapping.DestinationId);
            if (index >= 0)
            {
                data.Mappings[index] = mapping;
                
                EnsureDirectoryExists();
                
                // Save to file
                var jsonOut = JsonSerializer.Serialize(data, _jsonOptions);
                await File.WriteAllTextAsync(_filePath, jsonOut);
            }
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task SaveAsync(PeerMapping mapping)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            
            // Remove existing mapping with same destination ID
            data.Mappings.RemoveAll(m => m.DestinationId == mapping.DestinationId);
            
            // Add new mapping
            data.Mappings.Add(mapping);
            
            EnsureDirectoryExists();
            
            // Save to file
            var jsonOut = JsonSerializer.Serialize(data, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PeerMappingStore] Error saving mapping: {ex.Message}");
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task RemoveByDestinationIdAsync(int destinationId)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            data.Mappings.RemoveAll(m => m.DestinationId == destinationId);
            
            EnsureDirectoryExists();
            
            var jsonOut = JsonSerializer.Serialize(data, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task RemoveByRemotePeerIdAsync(string remotePeerId)
    {
        await _fileLock.WaitAsync();
        try
        {
            var data = await GetDataAsync();
            data.Mappings.RemoveAll(m => m.RemotePeerId == remotePeerId);
            
            EnsureDirectoryExists();
            
            var jsonOut = JsonSerializer.Serialize(data, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, jsonOut);
        }
        finally
        {
            _fileLock.Release();
        }
    }

	private void EnsureDirectoryExists()
	{
		var directory = Path.GetDirectoryName(_filePath);
		if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
		{
			Directory.CreateDirectory(directory);
		}
	}
}
