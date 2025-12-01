using Backend.Backup.Services;
using Backend.Core;
using Backend.Core.Infrastructure;
using Backend.DbModel.Database;
using Backend.WebApi.Services;
using Backend.WebApi.SignalR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using SIPSorcery.Net;
using System.Security.Cryptography;
using static Backend.Backup.Services.PeerMapping;

namespace Backend.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PairingController : ControllerBase
{
	private const string ChannelName = "backup";

    private readonly IAmbientDataResolver _ambientDataResolver;
    private readonly MpaDbContext _dbContext;
    private readonly IOptions<AppConfig> _config;
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly PeerConnectionService _peerConnectionService;
    private readonly PeerMappingStore _peerMappingStore;
    private readonly RecoveryCodeStore _recoveryCodeStore;
    private readonly WebRTCConnectionPool _connectionPool;
    private static readonly Dictionary<int, PairingSession> _activePairingSessions = new();
    private static readonly PairingCodeLimiter _rateLimiter = new(maxAttempts: 3, window: TimeSpan.FromMinutes(5));

    public PairingController(
        IAmbientDataResolver ambientDataResolver,
        MpaDbContext dbContext,
        IOptions<AppConfig> config,
        IHubContext<NotificationHub> hubContext,
        PeerConnectionService peerConnectionService,
        PeerMappingStore peerMappingStore,
        RecoveryCodeStore recoveryCodeStore,
        WebRTCConnectionPool connectionPool)
    {
        _ambientDataResolver = ambientDataResolver;
        _dbContext = dbContext;
        _config = config;
        _hubContext = hubContext;
        _peerConnectionService = peerConnectionService;
        _peerMappingStore = peerMappingStore;
        _recoveryCodeStore = recoveryCodeStore;
        _connectionPool = connectionPool;
    }

    [HttpPost("generate-code")]
    public async Task<ActionResult<PairingCodeResponse>> GenerateCode()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var signalingServerUrl = _config.Value.SignalingServerUrl!;

        // Connect to signaling server
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(signalingServerUrl)
            .WithAutomaticReconnect()
            .Build();

        await hubConnection.StartAsync();

        // Create WebRTC peer connection
        var config = new RTCConfiguration
        {
            iceServers = BuildIceServers(),
            iceTransportPolicy = RTCIceTransportPolicy.all,
            bundlePolicy = RTCBundlePolicy.max_bundle
        };
        var peerConnection = new RTCPeerConnection(config);


        // Create data channel
        var dataChannel = await peerConnection.createDataChannel(ChannelName);

		// Generate 6-digit code
        var code = GeneratePairingCode();

        // Track ICE gathering completion
        var iceGatheringComplete = new TaskCompletionSource<bool>();
        
        // Setup ICE gathering state handler
        peerConnection.onicegatheringstatechange += (state) =>
        {
            if (state == RTCIceGatheringState.complete)
            {
                iceGatheringComplete.TrySetResult(true);
            }
        };

        // Setup ICE candidate handling
        peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null)
            {
                var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                {
                    candidate = candidate.candidate,
                    sdpMLineIndex = candidate.sdpMLineIndex,
                    sdpMid = candidate.sdpMid
                });
                await hubConnection.SendAsync("SendIceCandidate", code, candidateJson);
            }
        };

        // Create offer
		// Generate peer ID for this instance
        var peerId = GetOrCreatePeerId();
        var offer = peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // Wait for ICE gathering to complete (with timeout)
        var gatheringTimeout = Task.Delay(TimeSpan.FromSeconds(10));
        await Task.WhenAny(iceGatheringComplete.Task, gatheringTimeout);

        // Send offer to signaling server
        try
        {
            await hubConnection.SendAsync("CreatePairing", code, offer.sdp, peerId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to send CreatePairing: {ex.Message}");
            throw;
        }

        // Listen for answer from the joiner
        hubConnection.On<string>("PairingAnswerReceived", (answerSdp) =>
        {
            var answer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.answer,
                sdp = answerSdp
            };

            peerConnection.setRemoteDescription(answer);
        });
        // Listen for when someone joins
        hubConnection.On<string>("PairingJoined", (remotePeerId) =>
        {
            if (_activePairingSessions.TryGetValue(tenantId, out var session))
            {
                session.RemotePeerId = remotePeerId;
            }
        });
        // Listen for ICE candidates from the joiner
        hubConnection.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
            if (candidate != null)
            {
                peerConnection.addIceCandidate(candidate);
            }
        });

        // Create completion source for connection establishment
        var connectionEstablished = new TaskCompletionSource<bool>();

        // Create a session to track this pairing (before setting up handlers that reference it)
        var session = new PairingSession
        {
            Code = code,
            PeerId = peerId,
            TenantId = tenantId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            HubConnection = hubConnection,
            PeerConnection = peerConnection,
            DataChannel = dataChannel,
            ConnectionEstablished = connectionEstablished
        };

        _activePairingSessions[tenantId] = session;

        // Setup data channel handlers
        dataChannel.onopen += async () =>
        {
            connectionEstablished.TrySetResult(true);
            
            // Update peer mapping to include the new remote peer ID
            // This is critical for recovery - the joiner may have a new peer ID after crash
            if (!string.IsNullOrEmpty(session.RemotePeerId))
            {
                // Check if this is a recovery pairing (we already have a destination for this tenant)
                var existingMapping = await _peerMappingStore.GetByTenantAsync(tenantId);
                
                if (existingMapping != null)
                {
                    // Recovery case: Update existing mapping with new remote peer ID
                    existingMapping.RemotePeerId = session.RemotePeerId;
                    existingMapping.PairedAt = DateTime.UtcNow;
                    await _peerMappingStore.UpdateAsync(existingMapping);
                }
                // For new pairings, mapping will be created in CompletePairing
            }
            
            // Notify frontend via SignalR
            await _hubContext.Clients.Group($"tenantId={tenantId}")
                .SendAsync("ReceiveMessage", new 
                {
                    messageType = "PairingConnected",
                    data = new 
                    {
                        code,
                        remotePeerId = session.RemotePeerId ?? "unknown",
                        isConnected = true
                    }
                });
        };

        dataChannel.onmessage += (dc, protocol, msgData) =>
        {
            var message = System.Text.Encoding.UTF8.GetString(msgData);
        };

        return Ok(new PairingCodeResponse
        {
            Code = code,
            ExpiresAt = session.ExpiresAt,
            PeerId = peerId
        });
    }

    [HttpPost("use-code")]
    public async Task<ActionResult<PairingResult>> UseCode([FromBody] UsePairingCodeRequest request)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var result = await UsePairingCodeInternal(request.Code, tenantId, isRecovery: false);
        
        if (!result.Success)
        {
            return BadRequest(result.Message);
        }

        return Ok(result);
    }

    private async Task<PairingResult> UsePairingCodeInternal(string code, int tenantId, bool isRecovery)
    {
        var signalingServerUrl = _config.Value.SignalingServerUrl!;

        if (string.IsNullOrWhiteSpace(code) || code.Length != 6)
            return new PairingResult { Success = false, PeerId = "", Target = "", Message = "Invalid pairing code format" };

        var rateLimitKey = $"pairing:code:{code}";
        
        if (!_rateLimiter.IsAllowed(rateLimitKey))
        {
            return new PairingResult { Success = false, PeerId = "", Target = "", Message = "Too many failed attempts for this pairing code." };
        }

        // Connect to signaling server
        var hubConnection = new HubConnectionBuilder()
            .WithUrl(signalingServerUrl)
            .WithAutomaticReconnect()
            .Build();

        await hubConnection.StartAsync();

        var peerId = GetOrCreatePeerId();
        var sessionEstablished = new TaskCompletionSource<PairingResult>();
        string? initiatorPeerId = null; // Track the initiator's peer ID
        
        // Create peer connection
        var config = new RTCConfiguration
        {
            iceServers = BuildIceServers(),
            iceTransportPolicy = RTCIceTransportPolicy.all,
            bundlePolicy = RTCBundlePolicy.max_bundle
        };
        var peerConnection = new RTCPeerConnection(config);
        

        // Setup ICE candidate handler
        peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null)
            {
                var candidateJson = JsonConvert.SerializeObject(new
                {
                    candidate = candidate.candidate,
                    sdpMid = candidate.sdpMid,
                    sdpMLineIndex = candidate.sdpMLineIndex
                });
                await hubConnection.SendAsync("SendIceCandidate", code, candidateJson);
            }
        };

        // Listen for data channel from offerer
        peerConnection.ondatachannel += (dataChannel) =>
        {
            // Check if already open
            if (dataChannel.readyState == RTCDataChannelState.open)
            {
                sessionEstablished.TrySetResult(new PairingResult
                {
                    Success = true,
                    PeerId = peerId,
                    Target = "", // Will be set after destination is saved
                    Message = "Pairing successful"
                });
            }
            else
            {
                dataChannel.onopen += () =>
                {
                    sessionEstablished.TrySetResult(new PairingResult
                    {
                        Success = true,
                        PeerId = peerId,
                        Target = "", // Will be set after destination is saved
                        Message = "Pairing successful"
                    });
                };
            }
        };

        // Listen for pairing offer (two separate parameters)
        hubConnection.On<string, string>("PairingOfferReceived", async (offerSdp, remotePeerId) =>
        {
            initiatorPeerId = remotePeerId; // Capture the initiator's peer ID
            
            var offer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.offer,
                sdp = offerSdp
            };
            
            peerConnection.setRemoteDescription(offer);
            
            // Create answer
            var answer = peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            // Wait for ICE gathering to complete before sending answer
            var iceGatheringComplete = new TaskCompletionSource<bool>();
            peerConnection.onicegatheringstatechange += (state) =>
            {
                if (state == RTCIceGatheringState.complete)
                {
                    iceGatheringComplete.TrySetResult(true);
                }
            };
            
            var gatheringTimeout = Task.Delay(TimeSpan.FromSeconds(10));
            await Task.WhenAny(iceGatheringComplete.Task, gatheringTimeout);
            
            // Send answer
            await hubConnection.SendAsync("SendAnswer", code, answer.sdp);
        });

        // Listen for ICE candidates from offerer
        hubConnection.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
            if (candidate != null)
            {
                peerConnection.addIceCandidate(candidate);
            }
        });

        // Join the pairing with the code
        await hubConnection.SendAsync("JoinPairing", code, peerId);

        // Wait for connection to establish (with timeout)
        var timeout = Task.Delay(TimeSpan.FromSeconds(30));
        var completed = await Task.WhenAny(sessionEstablished.Task, timeout);

        if (completed == timeout)
        {
            await hubConnection.DisposeAsync();
            peerConnection.close();
            return new PairingResult { Success = false, PeerId = "", Target = "", Message = "Pairing timeout - code may be invalid or expired" };
        }

        _rateLimiter.Reset(rateLimitKey);

        var result = await sessionEstablished.Task;
        
        // Save the pairing to database
        var destination = new BackupDestination
        {
            TenantId = tenantId,
            Title = isRecovery 
                ? $"Recovered from ({initiatorPeerId?[..8] ?? "unknown"})"
                : $"WebRTC Peer ({initiatorPeerId?[..8] ?? "unknown"})",
            Metadata = new System.Text.Json.Nodes.JsonObject
            {
                ["ProviderType"] = "WebRTC",
                ["RemotePeerId"] = initiatorPeerId ?? "unknown", // The initiator's peer ID
                ["LocalPeerId"] = peerId, // This joiner's peer ID
                ["PairedAt"] = DateTime.UtcNow.ToString("O"),
                ["IsInitiator"] = false,
                ["IsRecovery"] = isRecovery
            }
        };

        _dbContext.BackupDestinations.Add(destination);
        await _dbContext.SaveChangesAsync();
        
        // Update Target to use destinationId for reconnection
        destination.Metadata["Target"] = $"webrtc:{destination.Id}";
        await _dbContext.SaveChangesAsync();

        // Update the result with correct target
        result.Target = $"webrtc:{destination.Id}";

        // Save to JSON file for background service
        // For recovery, we are the Source (we will backup TO them after restore)
        await _peerMappingStore.SaveAsync(new PeerMapping
        {
            LocalPeerId = peerId,
            RemotePeerId = initiatorPeerId ?? "unknown",
            TenantId = tenantId,
            DestinationId = destination.Id,
            PairedAt = DateTime.UtcNow,
            Role = PairingRole.Source  // We backup TO them (we used the code)
        });

        // Register this peer ID with signaling server for reconnection requests
        await _peerConnectionService.RegisterPeerIdAsync(peerId, tenantId);

        return result;
    }

    [HttpPost("complete")]
    public async Task<ActionResult<CompletePairingResponse>> CompletePairing([FromBody] CompletePairingRequest request)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        var localPeerId = GetOrCreatePeerId();

        // Initiator saves the joiner's peer info to database
        var destination = new BackupDestination
        {
            TenantId = tenantId,
            Title = request.PeerName ?? $"WebRTC Peer ({request.PeerId[..8]}...)",
            Metadata = new System.Text.Json.Nodes.JsonObject
            {
                ["ProviderType"] = "WebRTC",
                ["RemotePeerId"] = request.PeerId,
                ["LocalPeerId"] = localPeerId,
                ["PairedAt"] = DateTime.UtcNow.ToString("O"),
                ["IsInitiator"] = true
            }
        };

        _dbContext.BackupDestinations.Add(destination);
        await _dbContext.SaveChangesAsync();
        
        // Update Target to use destinationId for reconnection
        destination.Metadata["Target"] = $"webrtc:{destination.Id}";
        await _dbContext.SaveChangesAsync();

        // Save to JSON file for background service
        await _peerMappingStore.SaveAsync(new PeerMapping
        {
            LocalPeerId = localPeerId,
            RemotePeerId = request.PeerId,
            TenantId = tenantId,
            DestinationId = destination.Id,
            PairedAt = DateTime.UtcNow,
            Role = PairingRole.Destination  // They will backup TO me (I generated the code)
        });

        // Register this peer ID with signaling server for reconnection requests
        await _peerConnectionService.RegisterPeerIdAsync(localPeerId, tenantId);

        return Ok(new CompletePairingResponse
        {
            DestinationId = destination.Id,
            Message = "Pairing saved successfully"
        });
    }

    [HttpGet("paired-peers")]
    public async Task<ActionResult<List<PairedPeerInfo>>> GetPairedPeers()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;

        // Read from JSON file
        var allMappings = await _peerMappingStore.GetAllAsync();
        var peers = allMappings
            .Where(m => m.TenantId == tenantId)
            .Select(m => new PairedPeerInfo
            {
                Id = m.DestinationId,
                Name = $"WebRTC Peer ({m.RemotePeerId[..8]}...)",
                Target = $"webrtc:{m.DestinationId}",
                RemotePeerId = m.RemotePeerId,
                PairedAt = m.PairedAt,
                IsInitiator = m.Role == PairingRole.Destination, // True if we generated code
                Role = m.Role.ToString(),
                IsConnected = _connectionPool.IsDestinationConnected(m.DestinationId)
            })
            .ToList();

        return Ok(peers);
    }

    [HttpGet("connection-status")]
    public ActionResult<Dictionary<int, bool>> GetConnectionStatuses()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        var mappings = _peerMappingStore.GetAllAsync().Result
            .Where(m => m.TenantId == tenantId)
            .ToList();

        var statuses = mappings.ToDictionary(
            m => m.DestinationId,
            m => _connectionPool.IsDestinationConnected(m.DestinationId)
        );

        return Ok(statuses);
    }

    [HttpPost("reconnect/{destinationId}")]
    public async Task<ActionResult> RequestReconnection(int destinationId)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;

        var mapping = await _peerMappingStore.GetByDestinationIdAsync(destinationId);

        if (mapping == null || mapping.TenantId != tenantId)
            return NotFound("Paired destination not found");

        var success = await _peerConnectionService.RequestReconnectionAsync(mapping.LocalPeerId, mapping.RemotePeerId, destinationId);

        if (success)
        {
            return Ok(new { message = "Reconnection request sent successfully" });
        }
        else
        {
            return StatusCode(500, new { message = "Failed to send reconnection request" });
        }
    }

    [HttpPost("check-connectivity/{destinationId}")]
    public async Task<IActionResult> CheckConnectivity(int destinationId)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        try
        {
            Console.WriteLine($"[Connectivity Check] Checking destination {destinationId} for tenant {tenantId}");
            
            // Verify this destination belongs to current tenant
            var mapping = await _peerMappingStore.GetByDestinationIdAsync(destinationId);
            if (mapping == null || mapping.TenantId != tenantId)
            {
                Console.WriteLine($"[Connectivity Check] Destination {destinationId} not found or wrong tenant");
                return NotFound();
            }

            Console.WriteLine($"[Connectivity Check] Found mapping: LocalPeer={mapping.LocalPeerId}, RemotePeer={mapping.RemotePeerId}");

            // Try to get or create connection (this will attempt reconnection if not connected)
            var connection = await _connectionPool.GetOrCreateConnectionAsync(destinationId);
            var isConnected = connection != null && _connectionPool.IsDestinationConnected(destinationId);
            
            Console.WriteLine($"[Connectivity Check] Destination {destinationId} connected: {isConnected}");
            
            return Ok(new { isConnected });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Connectivity Check] Error checking destination {destinationId}: {ex.Message}");
            return Ok(new { isConnected = false });
        }
    }

    [HttpDelete("paired-peers/{id}")]
    public async Task<ActionResult> DeletePairedPeer(int id)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;

        var mapping = await _peerMappingStore.GetByDestinationIdAsync(id);

        if (mapping == null || mapping.TenantId != tenantId)
            return NotFound("Paired peer not found");

        // Close WebRTC connection if exists
        await _connectionPool.CloseConnectionAsync(id);
        
        // Notify remote peer about unpairing
        if (!string.IsNullOrEmpty(mapping.RemotePeerId))
        {
            try
            {
                await _peerConnectionService.NotifyPeerUnpairedAsync(mapping.RemotePeerId);
            }
            catch
            {
                // Failed to notify remote peer - they may be offline
            }
        }

        // Remove from JSON file
        await _peerMappingStore.RemoveByDestinationIdAsync(id);

        // Also remove from database if it exists
        var destination = await _dbContext.BackupDestinations
            .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == tenantId);
        if (destination != null)
        {
            _dbContext.BackupDestinations.Remove(destination);
            await _dbContext.SaveChangesAsync();
        }

        return Ok(new { message = "Paired peer removed successfully" });
    }

    [HttpGet("status")]
    public ActionResult<PairingStatusResponse> GetStatus()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;

        if (_activePairingSessions.TryGetValue(tenantId, out var session))
        {
            var isConnected = session.ConnectionEstablished?.Task.IsCompleted ?? false;
            
            return Ok(new PairingStatusResponse
            {
                HasActiveSession = true,
                Code = session.Code,
                ExpiresAt = session.ExpiresAt,
                IsExpired = session.ExpiresAt < DateTime.UtcNow,
                IsConnected = isConnected,
                RemotePeerId = session.RemotePeerId
            });
        }

        return Ok(new PairingStatusResponse
        {
            HasActiveSession = false
        });
    }

    [HttpDelete("cancel")]
    public async Task<ActionResult> CancelPairing()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;

        if (_activePairingSessions.TryGetValue(tenantId, out var session))
        {
            if (session.HubConnection != null)
            {
                await session.HubConnection.DisposeAsync();
            }
            _activePairingSessions.Remove(tenantId);
            return Ok(new { message = "Pairing cancelled" });
        }

        return NotFound("No active pairing session");
    }

    [HttpPost("generate-recovery-code")]
    public async Task<ActionResult<RecoveryCodeResponse>> GenerateRecoveryCode()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        // Check if backups exist for this tenant
        var backupFolder = Path.Combine(_config.Value.BackupFolder, $"tenant_{tenantId}");
        var backupFiles = Directory.Exists(backupFolder) 
            ? Directory.GetFiles(backupFolder).Select(Path.GetFileName).Where(f => f != null).Cast<string>().ToList()
            : new List<string>();

        if (backupFiles.Count == 0)
        {
            return BadRequest("No backups available for recovery");
        }

        // Recovery code IS a pairing code - use the same signaling server infrastructure
        var pairingResponse = await GenerateCode();
        
        if (pairingResponse.Result is not OkObjectResult okResult || okResult.Value is not PairingCodeResponse pairingResult)
        {
            return StatusCode(500, "Failed to generate recovery code");
        }

		// Store recovery metadata locally (just for System B's UI to show available backups)
		// This is NOT used for validation - validation happens on the signaling server
		var recoveryMetadata = new RecoveryCode
        {
            Code = pairingResult.Code,
            TenantId = tenantId,
            LocalPeerId = pairingResult.PeerId,
            GeneratedAt = DateTime.UtcNow,
            ExpiresAt = pairingResult.ExpiresAt,
            IsUsed = false,
            AvailableBackups = backupFiles
        };
        await _recoveryCodeStore.SaveAsync(recoveryMetadata);

        return Ok(new RecoveryCodeResponse
        {
            Code = pairingResult.Code,
            ExpiresAt = pairingResult.ExpiresAt,
            TenantId = tenantId,
            AvailableBackupCount = backupFiles.Count
        });
    }

    [HttpPost("use-recovery-code")]
    public async Task<ActionResult<PairingResult>> UseRecoveryCode([FromBody] UseRecoveryCodeRequest request)
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        // Recovery code IS a pairing code - validation happens on the signaling server
        // System A (crashed) doesn't have the recoveryCodeStore, so we can't check it locally
        // The signaling server has the session created by System B's GenerateRecoveryCode call
        var result = await UsePairingCodeInternal(request.Code, tenantId, isRecovery: true);
        
        if (!result.Success)
        {
            return BadRequest(result.Message);
        }

        // Connection established via signaling server - ready for recovery
        return Ok(result);
    }

    private string GeneratePairingCode()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[4];
        rng.GetBytes(bytes);
        var number = BitConverter.ToUInt32(bytes, 0) % 900000 + 100000;
        return number.ToString();
    }

    private string GetOrCreatePeerId()
    {
        var tenantId = _ambientDataResolver.GetCurrentTenantId()!.Value;
        
        // Check if peer ID exists in mapping store
        var existingPeerId = _peerMappingStore.GetLocalPeerIdAsync(tenantId).Result;
        if (!string.IsNullOrEmpty(existingPeerId))
        {
            return existingPeerId;
        }
        
        // Generate new stable peer ID for this tenant
        var peerId = Guid.NewGuid().ToString();
        
        // Persist the peer ID
        _peerMappingStore.SetLocalPeerIdAsync(tenantId, peerId).Wait();
        
        return peerId;
    }

	private List<RTCIceServer> BuildIceServers(){
		return [.. _config.Value.IceServers.Select(ice => 
        {
            var server = new RTCIceServer { urls = ice.Urls };
            if (!string.IsNullOrEmpty(ice.Username))
                server.username = ice.Username;
            if (!string.IsNullOrEmpty(ice.Credential))
                server.credential = ice.Credential;
            return server;
        })];
	}

    private class PairingSession
    {
        public required string Code { get; set; }
        public required string PeerId { get; set; }
        public int TenantId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public HubConnection? HubConnection { get; set; }
        public RTCPeerConnection? PeerConnection { get; set; }
        public RTCDataChannel? DataChannel { get; set; }
        public TaskCompletionSource<bool>? ConnectionEstablished { get; set; }
        public string? RemotePeerId { get; set; }
    }

    public class PairingCodeResponse
    {
        public required string Code { get; set; } 
        public DateTime ExpiresAt { get; set; }
        public required string PeerId { get; set; }
    }

    public class UsePairingCodeRequest
    {
        public required string Code { get; set; }
    }

    public class CompletePairingRequest
    {
        public required string PeerId { get; set; }
        public string? PeerName { get; set; }
    }

    public class CompletePairingResponse
    {
        public int DestinationId { get; set; }
        public required string Message { get; set; }
    }

    public class PairedPeerInfo
    {
        public int Id { get; set; }
        public required string Name { get; set; }
        public required string Target { get; set; }
        public required string RemotePeerId { get; set; }
        public DateTime PairedAt { get; set; }
        public bool IsInitiator { get; set; }
        public required string Role { get; set; }
        public bool IsConnected { get; set; }
    }

    public class PairingResult
    {
        public bool Success { get; set; }
        public required string PeerId { get; set; }
        public required string Target { get; set; }
        public required string Message { get; set; }
    }

    public class PairingStatusResponse
    {
        public bool HasActiveSession { get; set; }
        public string? Code { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public bool IsExpired { get; set; }
        public bool IsConnected { get; set; }
        public string? RemotePeerId { get; set; }
    }

    public class RecoveryCodeResponse
    {
        public required string Code { get; set; }
        public DateTime ExpiresAt { get; set; }
        public int TenantId { get; set; }
        public int AvailableBackupCount { get; set; }
    }

    public class UseRecoveryCodeRequest
    {
        public required string Code { get; set; }
    }
}
