using System.Collections.Concurrent;
using Backend.Core;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using SIPSorcery.Net;
using static Backend.Backup.Services.PeerMapping;
using static Backend.Backup.Services.WebRtcPeerConnectionFactory;

namespace Backend.Backup.Services;

public class PeerConnectionService(IServiceProvider serviceProvider, IOptions<AppConfig> config, PeerMappingStore peerMappingStore) : IHostedService
{
    private HubConnection? _signalingConnection;
    private readonly Dictionary<string, int> _peerIdToTenantMap = [];
    // Tracks peer connection handles being established (not yet in pool) so ICE candidates can reach them.
    private readonly ConcurrentDictionary<int, PeerConnectionHandle> _pendingConnections = new();
    // One answer handler registration per localPeerId (prevents handler accumulation).
    private readonly ConcurrentDictionary<string, IDisposable> _answerHandlers = new();
    // Prevents concurrent reconnection attempts for the same destination.
    private readonly ConcurrentDictionary<int, byte> _reconnecting = new();
    // Buffers ICE candidates that arrive before any connection exists to receive them.
    // Keyed by destination ID, flushed when a pending connection is registered.
    private readonly ConcurrentDictionary<int, List<RTCIceCandidateInit>> _unbufferedCandidates = new();

	public async Task<bool> RequestReconnectionAsync(string localPeerId, string remotePeerId, int destinationId)
    {
        if (_signalingConnection == null || _signalingConnection.State != HubConnectionState.Connected)
        {
            Console.WriteLine($"[PeerConnectionService] Cannot reconnect destination {destinationId} - not connected to signaling server");
            return false;
        }

        // Prevent concurrent reconnection attempts for the same destination.
        // This guard stays locked until the connection is established or times out, which ensures
        // that stale answers from a previous attempt can never be applied to a new connection's SDP.
        if (!_reconnecting.TryAdd(destinationId, 0))
        {
            Console.WriteLine($"[PeerConnectionService] Reconnection already in progress for destination {destinationId}");
            return false;
        }

        try
        {
            // Clean up any previous pending connection for this destination
            CleanupPendingConnection(destinationId);

            using var scope = serviceProvider.CreateScope();
            var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();

            // Build the offer and a task that completes when the data channel opens (or the
            // connection fails). The task MUST resolve before we release _reconnecting so that
            // the retry loop never starts a new attempt while ICE negotiation is still running
            // on the current one. Overlapping attempts would cause mismatched offer/answer pairs
            // (different ICE ufrag/pwd) → ICE failure every time.
            var (offer, flushCandidates, connectionTask) = await PrepareReconnectionAsync(destinationId, localPeerId, remotePeerId, connectionPool);

            Console.WriteLine($"[PeerConnectionService] Sending reconnection offer for destination {destinationId} to peer {remotePeerId[..8]}");
            await _signalingConnection.SendAsync("SendReconnectionRequest", remotePeerId, localPeerId, offer);

            // Now that the offer is delivered, flush any candidates gathered before this point.
            await flushCandidates();

            // Block until connected (data channel open) or 35 s — long enough for TURN allocation
            // + ICE connectivity checks. Only then is _reconnecting released.
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(35));
            try
            {
                var connected = await connectionTask.WaitAsync(cts.Token);
                Console.WriteLine($"[PeerConnectionService] Reconnection for destination {destinationId}: {(connected ? "succeeded" : "failed (connection state)")}");
                return connected;
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine($"[PeerConnectionService] Reconnection timed out for destination {destinationId}");
                CleanupPendingConnection(destinationId);
                return false;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PeerConnectionService] Reconnection failed for destination {destinationId}: {ex.Message}");
            return false;
        }
        finally
        {
            _reconnecting.TryRemove(destinationId, out _);
        }
    }

    private void CleanupPendingConnection(int destinationId)
    {
        // Discard any candidates buffered for a previous failed attempt — they belong to a
        // dead ICE session and applying them to a new connection causes bogus connectivity
        // check failures that can make SIPSorcery declare the connection failed prematurely.
        _unbufferedCandidates.TryRemove(0, out _);

        if (_pendingConnections.TryRemove(destinationId, out var oldHandle))
        {
            Console.WriteLine($"[PeerConnectionService] Cleaning up old pending connection for destination {destinationId}");
            try
            {
                oldHandle.Connection.Close("replaced by new attempt");
                oldHandle.Connection.Dispose();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PeerConnectionService] Error disposing old connection {destinationId}: {ex.Message}");
            }
        }
    }

    public async Task RegisterPeerIdAsync(string peerId, int tenantId)
    {
        if (_signalingConnection == null || _signalingConnection.State != HubConnectionState.Connected)
        {
            Console.WriteLine($"[PeerConnectionService] Cannot register peer {peerId} - not connected to signaling server");
            return;
        }

        try
        {
            _peerIdToTenantMap[peerId] = tenantId;
            await _signalingConnection.SendAsync("RegisterPeerPresence", peerId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PeerConnectionService] Failed to register peer {peerId}: {ex.Message}");
        }
    }

    public async Task NotifyPeerUnpairedAsync(string remotePeerId)
    {
        if (_signalingConnection == null || _signalingConnection.State != HubConnectionState.Connected)
        {
            Console.WriteLine("Not connected to signaling server");
            return;
        }

        try
        {
            await _signalingConnection.SendAsync("NotifyPeerUnpaired", remotePeerId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PeerConnectionService] Failed to notify peer unpairing for {remotePeerId}: {ex.Message}");
        }
    }

    private async Task<(string offer, Func<Task> flushCandidates, Task<bool> connectionTask)> PrepareReconnectionAsync(int destinationId, string localPeerId, string remotePeerId, WebRTCConnectionPool connectionPool)
    {
        var connectionEstablished = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        // Buffer outgoing ICE candidates until the reconnection offer has been delivered.
        // Sending candidates before the remote has received the offer means they arrive at
        // a peer that has no connection context yet (no matching ICE session).
        var offerDelivered = false;
        var pendingOutgoing = new List<string>();

        var (handle, dataChannel, offerSdp) = await CreateAsOfferer(
            config.Value,
            "backup",
            onIceCandidate: async (candidate) =>
            {
                var candidateJson = JsonConvert.SerializeObject(candidate);
                Console.WriteLine($"[PeerConnectionService:Offerer:{destinationId}] Sending ICE candidate: {candidate.candidate}");
                lock (pendingOutgoing)
                {
                    if (!offerDelivered)
                    {
                        pendingOutgoing.Add(candidateJson);
                        return;
                    }
                }
                if (_signalingConnection != null)
                    await _signalingConnection.SendAsync("SendIceCandidateToPeer", remotePeerId, candidateJson);
            },
            logPrefix: $"PeerConnectionService:Offerer:{destinationId}");

        _pendingConnections[destinationId] = handle;

        // Flush any ICE candidates that arrived before this handle existed.
        if (_unbufferedCandidates.TryRemove(0, out var buffered))
        {
            List<RTCIceCandidateInit> snapshot;
            lock (buffered) { snapshot = new List<RTCIceCandidateInit>(buffered); }
            Console.WriteLine($"[PeerConnectionService] Flushing {snapshot.Count} buffered ICE candidate(s) to offerer {destinationId}");
            foreach (var c in snapshot)
                handle.AddRemoteCandidate(c);
        }

        // Complete the task when the data channel opens
        dataChannel.onopen += () =>
        {
            Console.WriteLine($"[PeerConnectionService] Data channel opened for destination {destinationId}");
            _pendingConnections.TryRemove(destinationId, out _);

            // Setup backup handler so this side can also RECEIVE backups/commands (bidirectional)
            var handler = new WebRTCBackupDataChannelHandler(
                backupFolder: config.Value.BackupFolder,
                serviceProvider: serviceProvider
            );
            handler.SetupHandlers(dataChannel, destinationId);

            connectionPool.StoreConnection(destinationId, handle.Connection, dataChannel, remotePeerId);
            connectionEstablished.TrySetResult(true);
        };

        // Also complete (with failure) if the connection transitions to a terminal state.
        // This prevents RequestReconnectionAsync from waiting the full 35 s when ICE fails fast.
        handle.Connection.onconnectionstatechange += (state) =>
        {
            Console.WriteLine($"[PeerConnectionService:Offerer:{destinationId}] Connection state: {state}");
            if (state == RTCPeerConnectionState.failed || state == RTCPeerConnectionState.closed)
            {
                _pendingConnections.TryRemove(destinationId, out _);
                connectionEstablished.TrySetResult(false);
            }
        };

        EnsureAnswerHandler(localPeerId);

        return (offerSdp, async () =>
        {
            // Flush candidates gathered before the offer was sent
            List<string> flushed;
            lock (pendingOutgoing) { offerDelivered = true; flushed = new List<string>(pendingOutgoing); pendingOutgoing.Clear(); }
            Console.WriteLine($"[PeerConnectionService] Flushing {flushed.Count} pre-offer outgoing candidate(s) for destination {destinationId}");
            foreach (var c in flushed)
            {
                if (_signalingConnection != null)
                    await _signalingConnection.SendAsync("SendIceCandidateToPeer", remotePeerId, c);
            }
        }, connectionEstablished.Task);
    }

    private void EnsureAnswerHandler(string localPeerId)
    {
        if (_answerHandlers.ContainsKey(localPeerId))
            return;

        var subscription = _signalingConnection!.On<string>($"AnswerFor{localPeerId}", (answerSdp) =>
        {
            Console.WriteLine($"[PeerConnectionService] Answer received for peer {localPeerId[..8]}, trying {_pendingConnections.Count} pending connection(s)");
            foreach (var (destId, pendingHandle) in _pendingConnections)
            {
                if (SetRemoteAnswer(pendingHandle, answerSdp, $"PeerConnectionService:Offerer:{destId}"))
                {
                    Console.WriteLine($"[PeerConnectionService] Answer applied to destination {destId}");
                    break;
                }
            }
        });

        _answerHandlers[localPeerId] = subscription;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            // Connect to signaling server
            var signalingServerUrl = config.Value.SignalingServerUrl;
            if (string.IsNullOrEmpty(signalingServerUrl))
            {
                Console.WriteLine("[PeerConnectionService] Signaling server URL not configured, skipping");
                return;
            }

            _signalingConnection = new HubConnectionBuilder()
                .WithUrl(signalingServerUrl)
                .WithAutomaticReconnect()
                .Build();

            // Setup event handlers
            SetupEventHandlers();

            await _signalingConnection.StartAsync(cancellationToken);
            Console.WriteLine("[PeerConnectionService] Connected to signaling server");

            // Register all peer IDs
            await RegisterAllPeerIdsAsync();

            // Proactively reconnect to all known peers in the background so the
            // connection pool is populated without waiting for a backup to run.
            _ = Task.Run(() => ReconnectAllPeersAsync(), cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PeerConnectionService] Failed to start: {ex.Message}");
        }
    }

    private async Task ReconnectAllPeersAsync()
    {
        // Allow the signaling server connection and peer-ID registrations to settle.
        await Task.Delay(TimeSpan.FromSeconds(5));

        var mappings = await peerMappingStore.GetAllAsync();

        // Only the initiator (the side that generated the pairing code) reconnects.
        // The other side handles incoming reconnection requests as a responder.
        // This eliminates glare and the double-connection problem.
        foreach (var mapping in mappings.Where(m => m.IsInitiator))
        {
            var ok = await RequestReconnectionAsync(mapping.LocalPeerId, mapping.RemotePeerId, mapping.DestinationId);
            Console.WriteLine($"[PeerConnectionService] Startup reconnect for destination {mapping.DestinationId}: {(ok ? "succeeded" : "failed")}");
        }

        // For non-initiator mappings, wait a bit then check if the remote peer reconnected us.
        // If not (remote may be offline), try from this side as fallback.
        await Task.Delay(TimeSpan.FromSeconds(15));

        using var poolScope = serviceProvider.CreateScope();
        var connectionPool = poolScope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();

        foreach (var mapping in mappings.Where(m => !m.IsInitiator))
        {
            if (connectionPool.IsDestinationConnected(mapping.DestinationId))
            {
                Console.WriteLine($"[PeerConnectionService] Destination {mapping.DestinationId} already connected by remote initiator");
                continue;
            }

            var ok = await RequestReconnectionAsync(mapping.LocalPeerId, mapping.RemotePeerId, mapping.DestinationId);
            Console.WriteLine($"[PeerConnectionService] Fallback reconnect for destination {mapping.DestinationId}: {(ok ? "succeeded" : "failed")}");
        }
    }

    private async Task RegisterAllPeerIdsAsync()
    {
        var mappings = await peerMappingStore.GetAllAsync();
        
        // Get unique local peer IDs
        var uniquePeers = mappings
            .GroupBy(m => m.LocalPeerId)
            .Select(g => new { PeerId = g.Key, g.First().TenantId })
            .ToList();

        foreach (var peer in uniquePeers)
        {
            try
            {
                _peerIdToTenantMap[peer.PeerId] = peer.TenantId;
                await _signalingConnection!.SendAsync("RegisterPeerPresence", peer.PeerId);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PeerConnectionService] Failed to register peer {peer.PeerId} during startup: {ex.Message}");
            }
        }
    }

    private void SetupEventHandlers()
    {
        // Handle incoming reconnection requests
        _signalingConnection!.On<string, string, string>("ReconnectionRequested", async (fromPeerId, toPeerId, offerSdp) =>
        {
            Console.WriteLine($"[PeerConnectionService] Reconnection requested from {fromPeerId[..8]} to {toPeerId[..8]}");
            try
            {
                using var scope = serviceProvider.CreateScope();
                var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();

                // Find the peer mapping
                var mapping = await peerMappingStore.GetByRemotePeerIdAsync(fromPeerId, toPeerId);

                if (mapping == null)
                {
                    Console.WriteLine($"[PeerConnectionService] No mapping found for remote={fromPeerId[..8]}, local={toPeerId[..8]}");
                    return;
                }

                Console.WriteLine($"[PeerConnectionService] Found mapping for destination {mapping.DestinationId}, creating responder");

                // Clean up any previous pending connection for this destination
                CleanupPendingConnection(mapping.DestinationId);

                // Create WebRTC peer connection as responder
                await EstablishConnectionAsResponderAsync(mapping.DestinationId, fromPeerId, offerSdp, connectionPool);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PeerConnectionService] Failed to handle reconnection request: {ex.Message}");
            }
        });

        _signalingConnection!.On<string>("PeerUnpaired", async (peerId) =>
        {
            
            using var scope = serviceProvider.CreateScope();
            var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();

            // Find all mappings with this remote peer
            var allMappings = await peerMappingStore.GetAllAsync();
            var matchingMappings = allMappings.Where(m => m.RemotePeerId == peerId).ToList();

            foreach (var mapping in matchingMappings)
            {
                await connectionPool.CloseConnectionAsync(mapping.DestinationId);
                await peerMappingStore.RemoveByDestinationIdAsync(mapping.DestinationId);
            }
        });

        // Handle incoming ICE candidates
        _signalingConnection!.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            try
            {
                Console.WriteLine($"[PeerConnectionService] ICE candidate received: {candidateJson[..Math.Min(80, candidateJson.Length)]}...");
                var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
                if (candidate != null)
                {
                    var deliveredToPool = 0;
                    var deliveredToPending = 0;

                    using var scope = serviceProvider.CreateScope();
                    var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();
                    
                    // Add candidate to all active connections (they'll filter by mid)
                    var allConnections = connectionPool.GetAllConnections();
                    foreach (var conn in allConnections)
                    {
                        conn.Connection.addIceCandidate(candidate);
                        deliveredToPool++;
                    }

                    // Also deliver to connections being established (not yet in pool)
                    foreach (var pending in _pendingConnections.Values)
                    {
                        pending.AddRemoteCandidate(candidate);
                        deliveredToPending++;
                    }

                    Console.WriteLine($"[PeerConnectionService] ICE candidate delivered to {deliveredToPool} pool + {deliveredToPending} pending connections");

                    // If no connections received this candidate, buffer it for future connections.
                    // This handles the race where the responder hasn't created its handle yet.
                    if (deliveredToPool == 0 && deliveredToPending == 0)
                    {
                        Console.WriteLine($"[PeerConnectionService] No connections available — buffering ICE candidate");
                        // Buffer under a special key (0) since we don't know the destination yet.
                        // Will be flushed when any pending connection is registered.
                        var buffer = _unbufferedCandidates.GetOrAdd(0, _ => new List<RTCIceCandidateInit>());
                        lock (buffer) { buffer.Add(candidate); }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PeerConnectionService] Failed to handle ICE candidate: {ex.Message}");
            }
        });
    }

    private async Task EstablishConnectionAsResponderAsync(int destinationId, string remotePeerId, string offerSdp, WebRTCConnectionPool connectionPool)
    {
        var connectionEstablished = new TaskCompletionSource<bool>();
        RTCDataChannel? dataChannel = null;

        var answererResult = await CreateAsAnswerer(
            config.Value,
            offerSdp,
            onIceCandidate: async (candidate) =>
            {
                if (_signalingConnection != null)
                {
                    var candidateJson = JsonConvert.SerializeObject(candidate);
                    Console.WriteLine($"[PeerConnectionService:Responder:{destinationId}] Sending ICE candidate: {candidate.candidate}");
                    await _signalingConnection.SendAsync("SendIceCandidateToPeer", remotePeerId, candidateJson);
                }
            },
            onDataChannelOpen: (dc) =>
            {
                dataChannel = dc;

                // Setup backup data channel handler
                var handler = new WebRTCBackupDataChannelHandler(
                    backupFolder: config.Value.BackupFolder,
                    serviceProvider: serviceProvider
                );
                handler.SetupHandlers(dc, destinationId);

                connectionEstablished.TrySetResult(true);
            },
            logPrefix: $"PeerConnectionService:Responder:{destinationId}");

        if (answererResult == null)
        {
            Console.WriteLine($"[PeerConnectionService] Failed to create responder for destination {destinationId}");
            return;
        }

        var handle = answererResult.Value.handle;
        _pendingConnections[destinationId] = handle;

        // Flush any ICE candidates that arrived before this handle existed.
        if (_unbufferedCandidates.TryRemove(0, out var buffered))
        {
            List<RTCIceCandidateInit> snapshot;
            lock (buffered) { snapshot = new List<RTCIceCandidateInit>(buffered); }
            Console.WriteLine($"[PeerConnectionService] Flushing {snapshot.Count} buffered ICE candidate(s) to responder {destinationId}");
            foreach (var c in snapshot)
                handle.AddRemoteCandidate(c);
        }

        // Send answer back
        Console.WriteLine($"[PeerConnectionService] Sending answer for destination {destinationId} to peer {remotePeerId[..8]}");
        await _signalingConnection!.SendAsync("SendAnswerToPeer", remotePeerId, answererResult.Value.answerSdp);

        // Wait for connection to establish (with timeout)
        var timeout = Task.Delay(TimeSpan.FromSeconds(30));
        var completed = await Task.WhenAny(connectionEstablished.Task, timeout);

        if (completed == timeout || dataChannel == null)
        {
            Console.WriteLine($"[PeerConnectionService] Responder connection timed out for destination {destinationId}");
            _pendingConnections.TryRemove(destinationId, out _);
            handle.Connection.Close("timeout");
            handle.Connection.Dispose();
            return;
        }

        // Store in connection pool
        Console.WriteLine($"[PeerConnectionService] Responder connection established for destination {destinationId}");
        _pendingConnections.TryRemove(destinationId, out _);
        connectionPool.StoreConnection(destinationId, handle.Connection, dataChannel, remotePeerId);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        // Dispose answer handlers
        foreach (var handler in _answerHandlers.Values)
            handler.Dispose();
        _answerHandlers.Clear();

        // Close pending connections
        foreach (var (destId, handle) in _pendingConnections)
        {
            try { handle.Connection.Close("shutdown"); handle.Connection.Dispose(); } catch (Exception ex) { Console.WriteLine($"[PeerConnectionService] Error closing pending connection during shutdown: {ex.Message}"); }
        }
        _pendingConnections.Clear();

        if (_signalingConnection != null)
        {
            // Unregister all peer IDs
            foreach (var peerId in _peerIdToTenantMap.Keys)
            {
                try
                {
                    await _signalingConnection.SendAsync("UnregisterPeerPresence", peerId, cancellationToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to unregister peer {peerId}: {ex.Message}");
                }
            }

            await _signalingConnection.DisposeAsync();
        }

        // Close all connections
        using var scope = serviceProvider.CreateScope();
        var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();
        await connectionPool.CloseAllConnectionsAsync();
    }
}
