using Backend.Core;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using SIPSorcery.Net;
using static Backend.Backup.Services.PeerMapping;

namespace Backend.Backup.Services;

public class PeerConnectionService(IServiceProvider serviceProvider, IOptions<AppConfig> config, PeerMappingStore peerMappingStore) : IHostedService
{
    private HubConnection? _signalingConnection;
    private readonly Dictionary<string, int> _peerIdToTenantMap = [];

	public async Task<bool> RequestReconnectionAsync(string localPeerId, string remotePeerId, int destinationId)
    {
        if (_signalingConnection == null || _signalingConnection.State != HubConnectionState.Connected)
        {
            return false;
        }

        try
        {
            using var scope = serviceProvider.CreateScope();
            var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();
            
            // Create WebRTC offer
            var (offer, peerConnection, dataChannel) = await CreateWebRTCOfferAsync(destinationId, localPeerId, remotePeerId, connectionPool);
            
            // Send reconnection request to remote peer
            await _signalingConnection.SendAsync("SendReconnectionRequest", remotePeerId, localPeerId, offer);
            return true;
        }
        catch
        {
            return false;
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
        catch
        {
            // Failed to register peer
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
        catch
        {
            // Failed to notify peer
        }
    }

    private async Task<(string offer, RTCPeerConnection peerConnection, RTCDataChannel dataChannel)> CreateWebRTCOfferAsync(int destinationId, string localPeerId, string remotePeerId, WebRTCConnectionPool connectionPool)
    {
        var config = new RTCConfiguration
        {
            iceServers = BuildIceServersList()
        };

        var peerConnection = new RTCPeerConnection(config);
        var dataChannel = await peerConnection.createDataChannel("backup");
        var connectionEstablished = new TaskCompletionSource<bool>();

        // Setup ICE candidate handler
        peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null && _signalingConnection != null)
            {
                var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                {
                    candidate = candidate.candidate,
                    sdpMLineIndex = candidate.sdpMLineIndex,
                    sdpMid = candidate.sdpMid
                });
                await _signalingConnection.SendAsync("SendIceCandidateToPeer", remotePeerId, candidateJson);
            }
        };

        // Setup data channel handlers
        dataChannel.onopen += () =>
        {
            Console.WriteLine($"[PeerConnectionService] Data channel opened for destination {destinationId}");
            connectionEstablished.TrySetResult(true);
            connectionPool.StoreConnection(destinationId, peerConnection, dataChannel, remotePeerId);
        };

        // Create offer
        var offer = peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Setup answer handler - listen for answers addressed to THIS peer (localPeerId)
        _signalingConnection!.On<string>($"AnswerFor{localPeerId}", (answerSdp) =>
        {
            var answer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.answer,
                sdp = answerSdp
            };
            peerConnection.setRemoteDescription(answer);
        });

        return (offer.sdp ?? string.Empty, peerConnection, dataChannel);
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
        }
        catch
        {
            // Failed to connect to signaling server
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
            catch
            {
            }
        }
    }

    private void SetupEventHandlers()
    {
        // Handle incoming reconnection requests
        _signalingConnection!.On<string, string, string>("ReconnectionRequested", async (fromPeerId, toPeerId, offerSdp) =>
        {
            try
            {
                using var scope = serviceProvider.CreateScope();
                var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();

                // Find the peer mapping
                var mapping = await peerMappingStore.GetByRemotePeerIdAsync(fromPeerId, toPeerId);

                if (mapping == null)
                {
                    return;
                }

                // Create WebRTC peer connection as responder
                await EstablishConnectionAsResponderAsync(mapping.DestinationId, fromPeerId, offerSdp, connectionPool);
            }
            catch (Exception ex)
            {
                // Failed to handle reconnection request
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
        _signalingConnection!.On<string>("IceCandidateReceived", async (candidateJson) =>
        {
            try
            {
                var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
                if (candidate != null)
                {
                    
                    using var scope = serviceProvider.CreateScope();
                    var connectionPool = scope.ServiceProvider.GetRequiredService<WebRTCConnectionPool>();
                    
                    // Add candidate to all active connections (they'll filter by mid)
                    var allConnections = connectionPool.GetAllConnections();
                    foreach (var conn in allConnections)
                    {
                        conn.Connection.addIceCandidate(candidate);
                    }
                }
            }
            catch
            {
                // Failed to handle ICE candidate
            }
        });
    }

    private async Task EstablishConnectionAsResponderAsync(int destinationId, string remotePeerId, string offerSdp, WebRTCConnectionPool connectionPool)
    {
        var rtcConfig = new RTCConfiguration
        {
            iceServers = BuildIceServersList()
        };

        var peerConnection = new RTCPeerConnection(rtcConfig);
        RTCDataChannel? dataChannel = null;

        // Setup ICE candidate handler
        peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null && _signalingConnection != null)
            {
                var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                {
                    candidate = candidate.candidate,
                    sdpMLineIndex = candidate.sdpMLineIndex,
                    sdpMid = candidate.sdpMid
                });
                await _signalingConnection.SendAsync("SendIceCandidateToPeer", remotePeerId, candidateJson);
            }
        };

        // Listen for data channel
        var connectionEstablished = new TaskCompletionSource<bool>();
        peerConnection.ondatachannel += (dc) =>
        {
            dataChannel = dc;

            // Setup backup data channel handler
            var handler = new WebRTCBackupDataChannelHandler(
                backupFolder: config.Value.BackupFolder, 
                serviceProvider: serviceProvider
            );
            handler.SetupHandlers(dc, destinationId);

            if (dc.readyState == RTCDataChannelState.open)
            {
                connectionEstablished.TrySetResult(true);
            }
            else
            {
                dc.onopen += () => connectionEstablished.TrySetResult(true);
            }
        };

        // Set remote description (offer)
        var offer = new RTCSessionDescriptionInit
        {
            type = RTCSdpType.offer,
            sdp = offerSdp
        };
        peerConnection.setRemoteDescription(offer);

        // Create answer
        var answer = peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        // Send answer back
        await _signalingConnection!.SendAsync("SendAnswerToPeer", remotePeerId, answer.sdp);

        // Wait for connection to establish (with timeout)
        var timeout = Task.Delay(TimeSpan.FromSeconds(30));
        var completed = await Task.WhenAny(connectionEstablished.Task, timeout);

        if (completed == timeout || dataChannel == null)
        {
            peerConnection.Close("timeout");
            peerConnection.Dispose();
            return;
        }

        // Store in connection pool
        connectionPool.StoreConnection(destinationId, peerConnection, dataChannel, remotePeerId);
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
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

	private List<RTCIceServer> BuildIceServersList()
	{
		var cfg = config.Value;
		var iceServers = new List<RTCIceServer>();
		foreach (var url in cfg.IceServers)
		{
			var server = new RTCIceServer { urls = url };
			var isTurn = url.StartsWith("turn:", StringComparison.OrdinalIgnoreCase)
			          || url.StartsWith("turns:", StringComparison.OrdinalIgnoreCase);
			if (isTurn && !string.IsNullOrEmpty(cfg.TurnUsername))
				server.username = cfg.TurnUsername;
			if (isTurn && !string.IsNullOrEmpty(cfg.TurnCredential))
				server.credential = cfg.TurnCredential;
			iceServers.Add(server);
		}
		return iceServers;
	}
}
