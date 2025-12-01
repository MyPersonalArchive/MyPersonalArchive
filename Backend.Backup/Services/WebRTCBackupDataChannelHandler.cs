using System.Collections.Concurrent;
using System.Text;
using Backend.Backup.Services;
using Microsoft.Extensions.DependencyInjection;
using SIPSorcery.Net;

namespace Backend.Backup.Services;

public class WebRTCBackupDataChannelHandler
{
    private readonly ConcurrentDictionary<int, IncomingFileState> _incomingFiles = new();
    private readonly string? _backupFolder;
    private readonly IServiceProvider? _serviceProvider;
    private static readonly Lock _logFileLock = new();

    public WebRTCBackupDataChannelHandler(string? backupFolder = null, IServiceProvider? serviceProvider = null)
    {
        _backupFolder = backupFolder;
        _serviceProvider = serviceProvider;
    }

    public void SetupHandlers(RTCDataChannel dataChannel, int destinationId)
    {
        Console.WriteLine($"[BackupDataChannelHandler] Setting up handlers for destination {destinationId}");

        dataChannel.onmessage += (dc, protocol, data) =>
        {
            // If we're currently receiving a file, check if this might be a binary chunk
            if (_incomingFiles.TryGetValue(destinationId, out var fileState) &&
                fileState.BytesReceived < fileState.ExpectedSize)
            {
                // Try to parse as text to check for TRANSFER_COMPLETE
                var text = Encoding.UTF8.GetString(data);
                if (text == "TRANSFER_COMPLETE")
                {
                    HandleTransferCompleteSync(destinationId, fileState);
                    return;
                }

                // Otherwise treat as binary chunk - write directly to disk
                if (fileState.FileStream != null)
                {
                    fileState.FileStream.Write(data, 0, data.Length);
                }
                fileState.BytesReceived += data.Length;
                return;
            }

            // Not currently receiving a file - parse as text command
            var message = Encoding.UTF8.GetString(data);

            // Check if it's a metadata or control message
            if (message.StartsWith("BACKUP|"))
            {
                HandleBackupMetadata(destinationId, message);
            }
            else if (message == "TRANSFER_COMPLETE")
            {
                if (_incomingFiles.TryGetValue(destinationId, out var state))
                {
                    HandleTransferCompleteSync(destinationId, state);
                }
            }
            else if (message.StartsWith("DELETE_ALL|"))
            {
                Console.WriteLine($"[BackupDataChannelHandler] Delete request received: {message}");
            }
            else if (message.StartsWith("LIST|"))
            {
                HandleListRequest(dataChannel, message);
            }
            else if (message.StartsWith("RESTORE|"))
            {
                HandleRestoreRequest(dataChannel, message);
            }
            else
            {
                Console.WriteLine($"[BackupDataChannelHandler] Received message: {message}");
            }
        };
    }

    private void HandleBackupMetadata(int destinationId, string message)
    {
        // Format: BACKUP|TENANT:{tenantId}|FILENAME:{name}|SIZE:{fileLength}
        var parts = message.Split('|');

        string? tenantId = null;
        string? fileName = null;
        long fileSize = 0;

        foreach (var part in parts)
        {
            if (part.StartsWith("TENANT:"))
                tenantId = part.Substring(7);
            else if (part.StartsWith("FILENAME:"))
                fileName = part.Substring(9);
            else if (part.StartsWith("SIZE:"))
                long.TryParse(part.Substring(5), out fileSize);
        }

        Console.WriteLine($"[BackupDataChannelHandler] Receiving: {fileName} ({fileSize:N0} bytes)");

        // Prepare file path and create directory
        string? filePath = null;
        FileStream? fileStream = null;
        
        if (!string.IsNullOrEmpty(_backupFolder) && !string.IsNullOrEmpty(tenantId))
        {
            var tenantBackupFolder = Path.Combine(_backupFolder, $"tenant_{tenantId}");
            Directory.CreateDirectory(tenantBackupFolder);
            filePath = Path.Combine(tenantBackupFolder, fileName!);
            
            // Create file stream to write chunks directly to disk
            fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, true);
        }

        _incomingFiles[destinationId] = new IncomingFileState
        {
            TenantId = tenantId,
            FileName = fileName,
            ExpectedSize = fileSize,
            BytesReceived = 0,
            FileStream = fileStream,
            FilePath = filePath
        };
    }

    private void HandleTransferCompleteSync(int destinationId, IncomingFileState fileState)
    {
        if (fileState.FileName != null)
        {
            if (fileState.BytesReceived == fileState.ExpectedSize)
            {
                Console.WriteLine($"[BackupDataChannelHandler]    Verified ({fileState.BytesReceived:N0} bytes)");
                
                // Close the file stream
                try
                {
                    fileState.FileStream?.Flush();
                    fileState.FileStream?.Close();
                    fileState.FileStream?.Dispose();
                    
                    if (!string.IsNullOrEmpty(fileState.FilePath))
                    {
                        Console.WriteLine($"[BackupDataChannelHandler]    Saved to: {fileState.FilePath}");
                        
                        // Create backup log entry - blocking synchronous write
                        if (_serviceProvider != null && int.TryParse(fileState.TenantId, out var tenantId))
                        {
                            CreateBackupLogEntry(tenantId, fileState.FileName!, fileState.BytesReceived, destinationId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[BackupDataChannelHandler]    Failed to finalize file: {ex.Message}");
                }
            }
            else
            {
                Console.WriteLine($"[BackupDataChannelHandler]    FAILED - Received {fileState.BytesReceived:N0} bytes, expected {fileState.ExpectedSize:N0} bytes");
                
                // Clean up failed file
                try
                {
                    fileState.FileStream?.Close();
                    fileState.FileStream?.Dispose();
                    
                    if (!string.IsNullOrEmpty(fileState.FilePath) && File.Exists(fileState.FilePath))
                    {
                        File.Delete(fileState.FilePath);
                    }
                }
                catch { }
            }

            // Reset for next file
            _incomingFiles.TryRemove(destinationId, out _);
        }
    }

    private void CreateBackupLogEntry(int tenantId, string fileName, long fileSizeBytes, int destinationId)
    {
        lock (_logFileLock)
        {
            try
            {
                using var scope = _serviceProvider!.CreateScope();
                var logFileService = scope.ServiceProvider.GetRequiredService<BackupLogFileService>();
                
                // Create a backup log entry for the received file
                var backupLog = new BackupLog
                {
                    Id = 0, // Will be assigned when saved
                    ItemType = "ReceivedBackup",
                    ItemId = destinationId,
                    ItemName = fileName,
                    ItemLastUpdated = DateTimeOffset.UtcNow,
                    StartedAt = DateTimeOffset.UtcNow,
                    CompletedAt = DateTime.UtcNow,
                    Status = BackupLog.BackupStatus.Success,
                    FileSizeBytes = fileSizeBytes,
                    BackupFileName = fileName,
                    TargetSystem = $"webrtc:{destinationId}",
                    TargetType = "WebRTC"
                };
                
                // Read existing logs, add new one, and save - blocking synchronous operations
                var existingLogs = logFileService.ReadAllSuccessfulLogsAsync(tenantId).GetAwaiter().GetResult();
                var allLogs = existingLogs.ToList();
                
                // Assign sequential ID
                backupLog.Id = allLogs.Any() ? allLogs.Max(l => l.Id) + 1 : 1;
                allLogs.Add(backupLog);
                
                logFileService.WriteLogsAsync(tenantId, allLogs).GetAwaiter().GetResult();
                
                Console.WriteLine($"[BackupDataChannelHandler] Created backup log entry for tenant {tenantId} (ID: {backupLog.Id}, Total: {allLogs.Count})");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BackupDataChannelHandler] Failed to create backup log: {ex.Message}");
            }
        }
    }

    private void HandleListRequest(RTCDataChannel dataChannel, string message)
    {
        // Format: LIST|TENANT:{tenantId}
        var parts = message.Split('|');
        string? tenantId = null;

        foreach (var part in parts)
        {
            if (part.StartsWith("TENANT:"))
                tenantId = part.Substring(7);
        }

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(_backupFolder))
        {
            dataChannel.send("LIST_COMPLETE");
            return;
        }

        Console.WriteLine($"[BackupDataChannelHandler] LIST request for tenant {tenantId}");

        var tenantBackupFolder = Path.Combine(_backupFolder, $"tenant_{tenantId}");
        if (!Directory.Exists(tenantBackupFolder))
        {
            dataChannel.send("LIST_COMPLETE");
            return;
        }

        var files = Directory.GetFiles(tenantBackupFolder);
        foreach (var file in files)
        {
            var fileName = Path.GetFileName(file);
            dataChannel.send($"FILE:{fileName}");
        }

        dataChannel.send("LIST_COMPLETE");
        Console.WriteLine($"[BackupDataChannelHandler] Sent {files.Length} files for tenant {tenantId}");
    }

    private void HandleRestoreRequest(RTCDataChannel dataChannel, string message)
    {
        // Format: RESTORE|TENANT:{tenantId}|FILE:{fileName}
        var parts = message.Split('|');
        string? tenantId = null;
        string? fileName = null;

        foreach (var part in parts)
        {
            if (part.StartsWith("TENANT:"))
                tenantId = part.Substring(7);
            else if (part.StartsWith("FILE:"))
                fileName = part.Substring(5);
        }

        if (string.IsNullOrEmpty(tenantId) || string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(_backupFolder))
        {
            dataChannel.send("TRANSFER_COMPLETE");
            return;
        }

        Console.WriteLine($"[BackupDataChannelHandler] RESTORE request for {fileName} (tenant {tenantId})");

        var filePath = Path.Combine(_backupFolder, $"tenant_{tenantId}", fileName);
        if (!File.Exists(filePath))
        {
            Console.WriteLine($"[BackupDataChannelHandler] File not found: {filePath}");
            dataChannel.send("TRANSFER_COMPLETE");
            return;
        }

        try
        {
            var fileBytes = File.ReadAllBytes(filePath);
            const int chunkSize = 16384; // 16KB chunks
            int totalChunks = (int)Math.Ceiling((double)fileBytes.Length / chunkSize);

            Console.WriteLine($"[BackupDataChannelHandler] Sending {fileBytes.Length} bytes in {totalChunks} chunks");

            for (int i = 0; i < totalChunks; i++)
            {
                int offset = i * chunkSize;
                int length = Math.Min(chunkSize, fileBytes.Length - offset);
                var chunk = new byte[length];
                Array.Copy(fileBytes, offset, chunk, 0, length);
                dataChannel.send(chunk);
            }

            dataChannel.send("TRANSFER_COMPLETE");
            Console.WriteLine($"[BackupDataChannelHandler] Transfer complete for {fileName}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BackupDataChannelHandler] Error sending file: {ex.Message}");
            dataChannel.send("TRANSFER_COMPLETE");
        }
    }

    private class IncomingFileState
    {
        public string? TenantId { get; set; }
        public string? FileName { get; set; }
        public long ExpectedSize { get; set; }
        public long BytesReceived { get; set; }
        public FileStream? FileStream { get; set; }
        public string? FilePath { get; set; }
    }
}
