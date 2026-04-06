using System.Collections.Concurrent;
using Microsoft.Extensions.DependencyInjection;
using SIPSorcery.Net;
using static Backend.Backup.Services.PeerMapping;

namespace Backend.Backup.Services;

public class WebRTCConnectionPool(IServiceProvider serviceProvider, PeerMappingStore peerMappingStore)
{
    private readonly ConcurrentDictionary<int, PeerConnection> _connections = new();

	public async Task<(RTCDataChannel dataChannel, string remotePeerId)?> GetOrCreateConnectionAsync(int destinationId)
    {
        // Check if active connection exists
        if (_connections.TryGetValue(destinationId, out var existing) && existing is not null)
        {
            var peerState = existing.Connection?.connectionState;
            var channel = existing.DataChannel;
            var channelState = channel?.readyState;
            
            if (channel is not null &&
                channelState == RTCDataChannelState.open && 
                (peerState == RTCPeerConnectionState.connected || peerState == RTCPeerConnectionState.connecting))
            {
                existing.LastUsed = DateTime.UtcNow;
                return (channel, existing.RemotePeerId);
            }

            await CloseConnectionAsync(destinationId);
        }

        return await EstablishNewConnectionAsync(destinationId);
    }

    private async Task<(RTCDataChannel dataChannel, string remotePeerId)?> EstablishNewConnectionAsync(int destinationId)
    {
        var mapping = await peerMappingStore.GetByDestinationIdAsync(destinationId);
        if (mapping == null)
        {
            return null;
        }
        
        using var scope = serviceProvider.CreateScope();
        var peerConnectionService = scope.ServiceProvider.GetRequiredService<PeerConnectionService>();

        // Request reconnection. If it returns false because a reconnection is ALREADY IN PROGRESS
        // (started by the background service), we should still wait for the pool to be populated
        // rather than giving up immediately — the connection will arrive within ~35s.
        var success = await peerConnectionService.RequestReconnectionAsync(
            mapping.LocalPeerId,
            mapping.RemotePeerId,
            destinationId
        );

        // Wait up to 35 seconds for connection to be stored in pool.
        // If success=true, the connection is being established right now.
        // If success=false (already in progress from background service), it may still arrive.
        var timeout = DateTime.UtcNow.AddSeconds(35);
        while (DateTime.UtcNow < timeout)
        {
            if (_connections.TryGetValue(destinationId, out var conn) &&
                conn is not null &&
                conn.DataChannel is not null &&
                conn.DataChannel.readyState == RTCDataChannelState.open)
            {
                return (conn.DataChannel, conn.RemotePeerId);
            }
            await Task.Delay(500);
        }

        return null;
    }

    public void StoreConnection(int destinationId, RTCPeerConnection peerConnection, RTCDataChannel dataChannel, string remotePeerId)
    {
        var connection = new PeerConnection
        {
            DestinationId = destinationId,
            Connection = peerConnection,
            DataChannel = dataChannel,
            RemotePeerId = remotePeerId,
            CreatedAt = DateTime.UtcNow,
            LastUsed = DateTime.UtcNow
        };

        _connections[destinationId] = connection;
        StartHealthCheck(connection);
    }

    private void StartHealthCheck(PeerConnection connection)
    {
        _ = Task.Run(async () =>
        {
            while (_connections.ContainsKey(connection.DestinationId))
            {
                await Task.Delay(TimeSpan.FromSeconds(30));

                if (connection.DataChannel?.readyState != RTCDataChannelState.open)
                {
                    await CloseConnectionAsync(connection.DestinationId);
                    break;
                }

                // Check if idle for too long (15 minutes)
                if (DateTime.UtcNow - connection.LastUsed > TimeSpan.FromMinutes(15))
                {
                    await CloseConnectionAsync(connection.DestinationId);
                    break;
                }

                try
                {
                    connection.DataChannel?.send("PING");
                }
                catch (Exception)
                {
                    await CloseConnectionAsync(connection.DestinationId);
                    break;
                }
            }
        });
    }

    public async Task CloseConnectionAsync(int destinationId)
    {
        if (_connections.TryRemove(destinationId, out var peerConnection))
        {
            peerConnection.DataChannel?.close();
            peerConnection.Connection?.Close("normal close");
            peerConnection.Connection?.Dispose();
            
            await Task.CompletedTask;
        }
    }

    public async Task CloseAllConnectionsAsync()
    {
        var tasks = _connections.Keys.Select(id => CloseConnectionAsync(id)).ToList();
        await Task.WhenAll(tasks);
    }

    public IEnumerable<PeerConnection> GetAllConnections()
    {
        return [.. _connections.Values];
    }

    public bool IsDestinationConnected(int destinationId)
    {
        if (_connections.TryGetValue(destinationId, out var connection))
        {
            var peerState = connection.Connection?.connectionState;
            var channelState = connection.DataChannel?.readyState;
            
            return channelState == RTCDataChannelState.open && 
                   (peerState == RTCPeerConnectionState.connected || peerState == RTCPeerConnectionState.connecting);
        }
        return false;
    }

    public class PeerConnection
    {
        public int DestinationId { get; set; }
        public required RTCPeerConnection Connection { get; set; }
        public required RTCDataChannel DataChannel { get; set; }
        public required string RemotePeerId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastUsed { get; set; }
    }
}
