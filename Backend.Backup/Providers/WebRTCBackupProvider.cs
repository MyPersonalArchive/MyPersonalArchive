using SIPSorcery.Net;
using Microsoft.AspNetCore.SignalR.Client;
using Backend.Backup.Services;
using Backend.Core.Providers;

namespace Backend.Backup.Providers;

public class WebRTCBackupProvider : IBackupProvider
{
    public string Name => "WebRTC";
    
    private RTCDataChannel? _dataChannel;
    private string? _remotePeerId;
    private readonly WebRTCConnectionPool _connectionPool;

    public WebRTCBackupProvider(WebRTCConnectionPool connectionPool)
    {
        _connectionPool = connectionPool;
    }

    public async Task Connect(string address)
    {
        Console.WriteLine($"[WebRTCBackupProvider.Connect] Starting connection to: {address}");
        
        // Address format: "webrtc:{destinationId}"
        if (!address.StartsWith("webrtc:"))
            throw new ArgumentException("Invalid WebRTC address format. Expected: webrtc:{destinationId}");

        var destinationIdStr = address.Substring(7); // Remove "webrtc:" prefix
        
        if (!int.TryParse(destinationIdStr, out var destinationId))
        {
            throw new ArgumentException($"Invalid destination ID: {destinationIdStr}");
        }

        Console.WriteLine($"[WebRTCBackupProvider.Connect] Parsed destination ID: {destinationId}");
        
        // Get or create connection from pool
        var connection = await _connectionPool.GetOrCreateConnectionAsync(destinationId);
        
        Console.WriteLine($"[WebRTCBackupProvider.Connect] Got connection from pool: {(connection != null ? "Yes" : "No")}");
        
        if (connection == null)
        {
            throw new InvalidOperationException($"Failed to establish connection for destination {destinationId}. Ensure the peer is online and paired.");
        }

        _dataChannel = connection.Value.dataChannel;
        _remotePeerId = connection.Value.remotePeerId;
        
        Console.WriteLine($"[WebRTCBackupProvider.Connect] Data channel state: {_dataChannel?.readyState}");
        Console.WriteLine($"[WebRTCBackupProvider.Connect] Remote peer ID: {_remotePeerId}");
    }

    public async Task BackupAsync(int tenantId, string name, Stream fileStream)
    {
        if (_dataChannel == null || _dataChannel.readyState != RTCDataChannelState.open)
        {
            throw new InvalidOperationException("WebRTC connection not established. Call Connect() first.");
        }

        // Send file in chunks (WebRTC has 16KB limit per message)
        const int chunkSize = 16 * 1024; // 16KB
        var buffer = new byte[chunkSize];
        int bytesRead;
        long totalSent = 0;
        var fileLength = fileStream.Length;

        // Send metadata first
        var metadata = $"BACKUP|TENANT:{tenantId}|FILENAME:{name}|SIZE:{fileLength}";
        _dataChannel.send(metadata);

        while ((bytesRead = await fileStream.ReadAsync(buffer, 0, chunkSize)) > 0)
        {
            var chunk = new byte[bytesRead];
            Array.Copy(buffer, chunk, bytesRead);
            
            _dataChannel.send(chunk);
            totalSent += bytesRead;

            // Small delay to avoid overwhelming the channel
            if (totalSent < fileLength)
                await Task.Delay(5);
        }

        // Send completion marker
        _dataChannel.send("TRANSFER_COMPLETE");
    }

    public async Task<List<string>> DeleteBackupsAsync(int tenantId)
    {
        if (_dataChannel == null || _dataChannel.readyState != RTCDataChannelState.open)
        {
            throw new InvalidOperationException("WebRTC connection not established");
        }

        _dataChannel.send($"DELETE_ALL|TENANT:{tenantId}");
        
        // Wait for confirmation with list of deleted files
        var deletedFiles = new List<string>();
        var confirmationReceived = new TaskCompletionSource<bool>();
        
        _dataChannel.onmessage += (dc, protocol, data) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(data);
            if (message.StartsWith("DELETED:"))
            {
                var fileName = message.Substring(8);
                deletedFiles.Add(fileName);
            }
            else if (message == "DELETE_COMPLETE")
            {
                confirmationReceived.SetResult(true);
            }
        };

        await Task.WhenAny(confirmationReceived.Task, Task.Delay(TimeSpan.FromSeconds(30)));
        
        return deletedFiles;
    }

    public async IAsyncEnumerable<(string name, Stream stream)> RestoreAsync(int tenantId, Action<int>? totalFilesCallback = null)
    {
        if (_dataChannel == null || _dataChannel.readyState != RTCDataChannelState.open)
        {
            throw new InvalidOperationException("WebRTC connection not established");
        }

        // Step 1: Request list of backups for tenant
        var fileList = new List<string>();
        var listReceived = new TaskCompletionSource<bool>();
        var isListHandlerActive = true;
        
        void ListMessageHandler(RTCDataChannel dc, DataChannelPayloadProtocols protocol, byte[] data)
        {
            if (!isListHandlerActive) return;
            
            var message = System.Text.Encoding.UTF8.GetString(data);
            Console.WriteLine($"[RestoreAsync] Received LIST response: {message}");
            
            if (message.StartsWith("FILE:"))
            {
                fileList.Add(message.Substring(5));
            }
            else if (message == "LIST_COMPLETE")
            {
                isListHandlerActive = false;
                listReceived.TrySetResult(true);
            }
        }
        
        _dataChannel.onmessage += ListMessageHandler;
        
        try
        {
            Console.WriteLine($"[RestoreAsync] Sending LIST request for tenant {tenantId}");
            _dataChannel.send($"LIST|TENANT:{tenantId}");

            var listTask = await Task.WhenAny(listReceived.Task, Task.Delay(TimeSpan.FromSeconds(30)));
            if (listTask != listReceived.Task)
            {
                throw new TimeoutException("Timeout waiting for file list");
            }

            Console.WriteLine($"[RestoreAsync] Received {fileList.Count} files to restore");
            
            // Notify caller of total file count
            totalFilesCallback?.Invoke(fileList.Count);

            // Step 2: Download each file
            foreach (var fileName in fileList)
            {
                Console.WriteLine($"[RestoreAsync] Requesting file: {fileName}");
                
                var memoryStream = new MemoryStream();
                var fileReceived = new TaskCompletionSource<bool>();
                var isFileHandlerActive = true;

                void FileMessageHandler(RTCDataChannel dc, DataChannelPayloadProtocols protocol, byte[] data)
                {
                    if (!isFileHandlerActive) return;
                    
                    var textMessage = System.Text.Encoding.UTF8.GetString(data);
                    
                    if (textMessage == "TRANSFER_COMPLETE")
                    {
                        Console.WriteLine($"[RestoreAsync] File transfer complete: {fileName}");
                        isFileHandlerActive = false;
                        fileReceived.TrySetResult(true);
                        return;
                    }

                    // Write binary data to stream
                    memoryStream.Write(data, 0, data.Length);
                }

                _dataChannel.onmessage += FileMessageHandler;

                try
                {
                    // Request the file
                    _dataChannel.send($"RESTORE|TENANT:{tenantId}|FILE:{fileName}");

                    var fileTask = await Task.WhenAny(fileReceived.Task, Task.Delay(TimeSpan.FromMinutes(5)));
                    if (fileTask != fileReceived.Task)
                    {
                        throw new TimeoutException($"Timeout waiting for file: {fileName}");
                    }

                    memoryStream.Position = 0;
                    Console.WriteLine($"[RestoreAsync] Yielding file: {fileName} ({memoryStream.Length} bytes)");
                    yield return (fileName, memoryStream);
                }
                finally
                {
                    isFileHandlerActive = false;
                    _dataChannel.onmessage -= FileMessageHandler;
                }
            }
        }
        finally
        {
            isListHandlerActive = false;
            _dataChannel.onmessage -= ListMessageHandler;
        }
    }

}
