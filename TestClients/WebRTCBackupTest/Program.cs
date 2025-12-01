using Microsoft.AspNetCore.SignalR.Client;
using SIPSorcery.Net;
using Newtonsoft.Json;
using System.Security.Cryptography;
using System.Text;

// ==================== USAGE GUIDE ====================
// 
// MODE 3: Persistent Mode (Recommended for Testing Reconnection)
// --------------------------------------------------------
// 1. Start test client in mode 3 (persistent)
// 2. Note the displayed Peer ID
// 3. In main app: Generate code and pair with test client
// 4. Save peer ID from the pairing
// 5. Restart test client (mode 3) - it will keep same Peer ID
// 6. In main app: Trigger backup - backend will auto-reconnect
//
// MODE 1 & 2: One-time Pairing (Original Behavior)
// --------------------------------------------------------
// Use for initial testing but connection lost on restart
//
// =====================================================

namespace WebRTCBackupTest;

class Program
{
    private static RTCPeerConnection? _peerConnection;
    private static RTCDataChannel? _dataChannel;
    private static HubConnection? _signalingConnection;
    private static TaskCompletionSource<bool>? _connectionEstablished;
    private static string? _currentPairingCode;
    private static string? _myPeerId; // Persistent peer ID
    private static string? _remotePeerId; // Remote peer ID after pairing
    private static bool _isPersistentMode = false; // Track if running in persistent mode

    static async Task Main(string[] args)
    {
        Console.WriteLine("=== WebRTC Backup Test Client ===\n");

        // Configuration
        var signalingServerUrl = "wss://mpasignalingserver-production.up.railway.app/signaling";
        
        Console.WriteLine("\nSelect mode:");
        Console.WriteLine("1. Generate pairing code (offer)");
        Console.WriteLine("2. Join with pairing code (answer)");
        Console.WriteLine("3. Persistent mode (listen for reconnection requests)");
        Console.Write("\nChoice: ");
        var choice = Console.ReadLine();

        try
        {
            if (choice == "1")
            {
                await RunAsOfferer(signalingServerUrl);
            }
            else if (choice == "2")
            {
                await RunAsAnswerer(signalingServerUrl);
            }
            else if (choice == "3")
            {
                _isPersistentMode = true;
                await RunPersistentMode(signalingServerUrl);
            }
            else
            {
                Console.WriteLine("Invalid choice");
                return;
            }

            // Keep alive to test data channel
            Console.WriteLine("\nPress 's' to send test data, 'q' to quit");
            while (true)
            {
                var key = Console.ReadKey(true);
                if (key.KeyChar == 'q')
                    break;
                else if (key.KeyChar == 's')
                {
                    await SendTestData();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\nError: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
        finally
        {
            await Cleanup();
        }
    }

    static async Task RunAsOfferer(string signalingServerUrl)
    {
        Console.WriteLine("\nRunning as OFFERER (generating code)...");

        // Connect to signaling server
        _signalingConnection = new HubConnectionBuilder()
            .WithUrl(signalingServerUrl)
            .WithAutomaticReconnect()
            .Build();

        await _signalingConnection.StartAsync();
        Console.WriteLine("Connected to signaling server");

        // Generate pairing code
        _currentPairingCode = GenerateRandomCode();
        var peerId = GeneratePeerId();
        Console.WriteLine($"\nPairing Code: {_currentPairingCode}");
        Console.WriteLine($"   Peer ID: {peerId}");
        Console.WriteLine("   Share this code with the other peer...\n");

        // Create peer connection
        var config = new RTCConfiguration
        {
            iceServers = new List<RTCIceServer>
            {
                new RTCIceServer { urls = "stun:stun.l.google.com:19302" },
                new RTCIceServer { urls = "stun:stun1.l.google.com:19302" }
            }
        };
        _peerConnection = new RTCPeerConnection(config);

        // Create data channel
        _dataChannel = await _peerConnection.createDataChannel("backup");
        SetupDataChannelHandlers();

        // Setup ICE candidate handling
        _peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null)
            {
                Console.WriteLine($"Sending ICE candidate: {candidate.candidate}");
                var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                {
                    candidate = candidate.candidate,
                    sdpMLineIndex = candidate.sdpMLineIndex,
                    sdpMid = candidate.sdpMid
                });
                await _signalingConnection!.SendAsync("SendIceCandidate", _currentPairingCode, candidateJson);
            }
        };

        _peerConnection.onconnectionstatechange += (state) =>
        {
            Console.WriteLine($"Connection state: {state}");
        };

        // Create offer
        var offer = _peerConnection.createOffer();
        await _peerConnection.setLocalDescription(offer);
        Console.WriteLine("Created SDP offer");

        // Send offer via signaling
        await _signalingConnection.SendAsync("CreatePairing", _currentPairingCode, offer.sdp, peerId);
        Console.WriteLine("Sent offer to signaling server");

        // Listen for answer
        _connectionEstablished = new TaskCompletionSource<bool>();
        _signalingConnection.On<string>("PairingAnswerReceived", async (answerSdp) =>
        {
            Console.WriteLine("Received SDP answer");

            var answer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.answer,
                sdp = answerSdp
            };

            var result = _peerConnection.setRemoteDescription(answer);
            if (result == SetDescriptionResultEnum.OK)
            {
                Console.WriteLine("Set remote description");
                _connectionEstablished.TrySetResult(true);
            }
            else
            {
                Console.WriteLine($"Failed to set remote description: {result}");
            }
        });

        // Receive ICE candidates
        _signalingConnection.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            Console.WriteLine("Received ICE candidate");
            var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
            if (candidate != null && _peerConnection != null)
            {
                _peerConnection.addIceCandidate(candidate);
            }
        });

        Console.WriteLine("Waiting for peer to join...");
        await _connectionEstablished.Task;
        Console.WriteLine("WebRTC connection established!");
    }
    static async Task RunPersistentMode(string signalingServerUrl)
    {
        Console.WriteLine("\nRunning in PERSISTENT MODE (listening for reconnection requests)...");
        
        // Load or generate persistent peer ID
        _myPeerId = LoadOrGeneratePeerId();
        Console.WriteLine($"My Peer ID: {_myPeerId}");
        Console.WriteLine("\nSave this Peer ID! You'll need it to pair with the main app.");
        
        // Connect to signaling server
        _signalingConnection = new HubConnectionBuilder()
            .WithUrl(signalingServerUrl)
            .WithAutomaticReconnect()
            .Build();

        _signalingConnection.Reconnecting += error =>
        {
            Console.WriteLine($"Reconnecting to signaling server... {error?.Message}");
            return Task.CompletedTask;
        };

        _signalingConnection.Reconnected += async connectionId =>
        {
            Console.WriteLine("Reconnected to signaling server, re-registering peer ID...");
            await _signalingConnection.SendAsync("RegisterPeerPresence", _myPeerId);
            return;
        };

        await _signalingConnection.StartAsync();
        Console.WriteLine("Connected to signaling server");

        // Register peer presence
        await _signalingConnection.SendAsync("RegisterPeerPresence", _myPeerId);
        Console.WriteLine("Registered peer presence");

        // Listen for reconnection requests (3 parameters: fromPeerId, toPeerId, offerSdp)
        _signalingConnection.On<string, string, string>("ReconnectionRequested", async (fromPeerId, toPeerId, offerSdp) =>
        {
            Console.WriteLine($"\nRECONNECTION REQUEST from {fromPeerId} to {toPeerId}");
            _remotePeerId = fromPeerId;
            await HandleReconnectionRequest(fromPeerId, offerSdp);
        });

        // Listen for peer unpaired notifications
        _signalingConnection.On("PeerUnpaired", () =>
        {
            Console.WriteLine("\nPeer has unpaired - cleaning up connection");
            if (_peerConnection != null)
            {
                _peerConnection.Close("peer unpaired");
                _peerConnection.Dispose();
                _peerConnection = null;
            }
            if (_dataChannel != null)
            {
                _dataChannel.close();
                _dataChannel = null;
            }
        });

        // Listen for ICE candidates from remote peer
        _signalingConnection.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            try
            {
                if (_peerConnection != null)
                {
                    var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
                    if (candidate != null)
                    {
                        Console.WriteLine($"Received ICE candidate from remote peer");
                        _peerConnection.addIceCandidate(candidate);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding ICE candidate: {ex.Message}");
            }
        });

        Console.WriteLine("\nPersistent mode active - waiting for reconnection requests...");
        Console.WriteLine("(Keep this running to receive backups)");
    }

    static async Task HandleReconnectionRequest(string fromPeerId, string offerSdp)
    {
        try
        {
            // Close existing connection if any
            if (_peerConnection != null)
            {
                Console.WriteLine("   Closing existing connection...");
                _peerConnection.Close("reconnecting");
                _peerConnection.Dispose();
            }

            // Create new peer connection
            var config = new RTCConfiguration
            {
                iceServers = new List<RTCIceServer>
                {
                    new RTCIceServer { urls = "stun:stun.l.google.com:19302" },
                    new RTCIceServer { urls = "stun:stun1.l.google.com:19302" },
                    new RTCIceServer 
                    { 
                        urls = "turn:openrelay.metered.ca:80",
                        username = "openrelayproject",
                        credential = "openrelayproject",
                        credentialType = RTCIceCredentialType.password
                    },
                    new RTCIceServer 
                    { 
                        urls = "turn:openrelay.metered.ca:80",
                        username = "openrelayproject",
                        credential = "openrelayproject",
                        credentialType = RTCIceCredentialType.password
                    }
                }
            };
            _peerConnection = new RTCPeerConnection(config);
            Console.WriteLine("Created new peer connection");

            // Setup data channel reception
            _peerConnection.ondatachannel += (dc) =>
            {
                Console.WriteLine($"Data channel received: {dc.label}");
                _dataChannel = dc;
                SetupDataChannelHandlers();
            };

            // Setup ICE candidate handling
            _peerConnection.onicecandidate += async (candidate) =>
            {
                if (candidate != null && _signalingConnection != null)
                {
                    Console.WriteLine($"Sending ICE candidate to {fromPeerId}");
                    var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                    {
                        candidate = candidate.candidate,
                        sdpMLineIndex = candidate.sdpMLineIndex,
                        sdpMid = candidate.sdpMid
                    });
                    await _signalingConnection.SendAsync("SendIceCandidateToPeer", fromPeerId, candidateJson);
                }
            };

            _peerConnection.onconnectionstatechange += (state) =>
            {
                Console.WriteLine($"   🔌 Connection state: {state}");
                if (state == RTCPeerConnectionState.connected)
                {
                    Console.WriteLine("WebRTC connection established!");
                }
            };

            // Set remote description (offer)
            var offer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.offer,
                sdp = offerSdp
            };

            var result = _peerConnection.setRemoteDescription(offer);
            if (result != SetDescriptionResultEnum.OK)
            {
                Console.WriteLine($"Failed to set remote description: {result}");
                return;
            }
            Console.WriteLine("Set remote description");

            // Create answer
            var answer = _peerConnection.createAnswer();
            await _peerConnection.setLocalDescription(answer);
            Console.WriteLine("Created SDP answer");

            // Send answer back
            await _signalingConnection!.SendAsync("SendAnswerToPeer", fromPeerId, answer.sdp);
            Console.WriteLine($"Sent answer to {fromPeerId}");

            Console.WriteLine("Reconnection handshake complete - waiting for data channel...");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error handling reconnection: {ex.Message}");
        }
    }

    static string LoadOrGeneratePeerId()
    {
        var peerIdFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".webrtc-test-peer-id");
        
        if (File.Exists(peerIdFile))
        {
            var existingId = File.ReadAllText(peerIdFile).Trim();
            if (!string.IsNullOrEmpty(existingId))
            {
                Console.WriteLine("(Loaded existing peer ID from file)");
                return existingId;
            }
        }

        var newPeerId = Guid.NewGuid().ToString();
        File.WriteAllText(peerIdFile, newPeerId);
        Console.WriteLine("(Generated and saved new peer ID)");
        return newPeerId;
    }
    static async Task RunAsAnswerer(string signalingServerUrl)
    {
        Console.WriteLine("\nRunning as ANSWERER (joining with code)...");

        Console.Write("Enter pairing code: ");
        _currentPairingCode = Console.ReadLine()?.Trim();

        if (string.IsNullOrEmpty(_currentPairingCode) || _currentPairingCode.Length != 6)
        {
            Console.WriteLine("Invalid pairing code");
            return;
        }

        // Connect to signaling server
        _signalingConnection = new HubConnectionBuilder()
            .WithUrl(signalingServerUrl)
            .WithAutomaticReconnect()
            .Build();

        await _signalingConnection.StartAsync();
        Console.WriteLine("Connected to signaling server");

        var peerId = GeneratePeerId();
        Console.WriteLine($"Peer ID: {peerId}");

        // Create peer connection
        var config = new RTCConfiguration
        {
            iceServers = new List<RTCIceServer>
            {
                new RTCIceServer { urls = "stun:stun.l.google.com:19302" },
                new RTCIceServer { urls = "stun:stun1.l.google.com:19302" }
            }
        };
        _peerConnection = new RTCPeerConnection(config);

        // Setup data channel reception
        _peerConnection.ondatachannel += (dc) =>
        {
            Console.WriteLine($"Data channel received: {dc.label}");
            _dataChannel = dc;
            SetupDataChannelHandlers();
        };

        // Setup ICE candidate handling
        _peerConnection.onicecandidate += async (candidate) =>
        {
            if (candidate != null)
            {
                Console.WriteLine("Sending ICE candidate");
                var candidateJson = JsonConvert.SerializeObject(new RTCIceCandidateInit
                {
                    candidate = candidate.candidate,
                    sdpMLineIndex = candidate.sdpMLineIndex,
                    sdpMid = candidate.sdpMid
                });
                await _signalingConnection!.SendAsync("SendIceCandidate", _currentPairingCode, candidateJson);
            }
        };

        _peerConnection.onconnectionstatechange += (state) =>
        {
            Console.WriteLine($"Connection state: {state}");
        };

        // Listen for offer
        _connectionEstablished = new TaskCompletionSource<bool>();
        _signalingConnection.On<string, string>("PairingOfferReceived", async (offerSdp, remotePeerId) =>
        {
            Console.WriteLine($"Received SDP offer from {remotePeerId}");

            var offer = new RTCSessionDescriptionInit
            {
                type = RTCSdpType.offer,
                sdp = offerSdp
            };

            var result = _peerConnection.setRemoteDescription(offer);
            if (result == SetDescriptionResultEnum.OK)
            {
                Console.WriteLine("Set remote description");

                // Create answer
                var answer = _peerConnection.createAnswer();
                await _peerConnection.setLocalDescription(answer);
                Console.WriteLine("Created SDP answer");

                // Send answer via signaling (using SendAnswer method)
                await _signalingConnection.SendAsync("SendAnswer", _currentPairingCode, answer.sdp);
                Console.WriteLine("Sent answer to signaling server");

                _connectionEstablished.TrySetResult(true);
            }
            else
            {
                Console.WriteLine($"Failed to set remote description: {result}");
            }
        });

        // Receive ICE candidates
        _signalingConnection.On<string>("IceCandidateReceived", (candidateJson) =>
        {
            Console.WriteLine("Received ICE candidate");
            var candidate = JsonConvert.DeserializeObject<RTCIceCandidateInit>(candidateJson);
            if (candidate != null && _peerConnection != null)
            {
                _peerConnection.addIceCandidate(candidate);
            }
        });

        // Join the pairing to get the offer
        Console.WriteLine($"Joining pairing with code: {_currentPairingCode}");
        await _signalingConnection.SendAsync("JoinPairing", _currentPairingCode, peerId);

        Console.WriteLine("Waiting for offer...");
        await _connectionEstablished.Task;
        Console.WriteLine("WebRTC connection established!");
    }

    // File reception state
    static string? _currentFileName;
    static long _currentFileSize;
    static long _currentFileReceived;
    static List<byte> _currentFileData = new();

    static void SetupDataChannelHandlers()
    {
        if (_dataChannel == null) return;

        _dataChannel.onopen += () =>
        {
            Console.WriteLine("Data channel opened - ready for backup!");
        };

        _dataChannel.onclose += () =>
        {
            Console.WriteLine("Data channel closed");
        };

        _dataChannel.onerror += (error) =>
        {
            Console.WriteLine($"Data channel error: {error}");
        };

        Console.WriteLine($"Data channel state: {_dataChannel.readyState}");

        _dataChannel.onmessage += (dc, protocol, data) =>
        {
            // If we're currently receiving a file, check if this might be a binary chunk
            if (_currentFileName != null && _currentFileReceived < _currentFileSize)
            {
                // Try to parse as text to check for TRANSFER_COMPLETE
                var text = Encoding.UTF8.GetString(data);
                if (text == "TRANSFER_COMPLETE")
                {
                    HandleTransferComplete();
                    return;
                }
                
                // Otherwise treat as binary chunk
                _currentFileData.AddRange(data);
                _currentFileReceived += data.Length;
                return;
            }
            
            // Not currently receiving a file - parse as text command
            var message = Encoding.UTF8.GetString(data);
            
            // Check if it's a metadata or control message
            if (message.StartsWith("BACKUP|"))
            {
                HandleBackupMetadata(message);
            }
            else if (message == "TRANSFER_COMPLETE")
            {
                HandleTransferComplete();
            }
            else if (message.StartsWith("DELETE_ALL|"))
            {
                Console.WriteLine($"Delete request: {message}");
            }
            else
            {
                // Regular message
                Console.WriteLine($"Received: {message}");
            }
        };
    }

    static void HandleBackupMetadata(string message)
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
        
        Console.WriteLine($"\n{fileName} ({fileSize:N0} bytes)");
        
        _currentFileName = fileName;
        _currentFileSize = fileSize;
        _currentFileReceived = 0;
        _currentFileData.Clear();
    }

    static void HandleTransferComplete()
    {
        if (_currentFileName != null)
        {
            if (_currentFileReceived == _currentFileSize)
            {
                Console.WriteLine($"Verified ({_currentFileReceived:N0} bytes)");
            }
            else
            {
                Console.WriteLine($"FAILED - Received {_currentFileReceived:N0} bytes, expected {_currentFileSize:N0} bytes");
            }
            
            // Reset for next file
            _currentFileName = null;
            _currentFileSize = 0;
            _currentFileReceived = 0;
            _currentFileData.Clear();
        }
    }

    static async Task SendTestData()
    {
        if (_dataChannel == null || _dataChannel.readyState != RTCDataChannelState.open)
        {
            Console.WriteLine("Data channel not open");
            return;
        }

        var testMessage = $"TEST|{DateTime.UtcNow:O}|Hello from test client!";
        _dataChannel.send(testMessage);
        Console.WriteLine($"Sent: {testMessage}");

        await Task.CompletedTask;
    }

    static string GenerateRandomCode()
    {
        var random = new Random();
        return random.Next(100000, 999999).ToString();
    }

    static string GeneratePeerId()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[16];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    static async Task Cleanup()
    {
        Console.WriteLine("\nCleaning up...");

        // Unregister peer presence if in persistent mode
        if (_isPersistentMode && _signalingConnection != null && _myPeerId != null)
        {
            try
            {
                await _signalingConnection.SendAsync("UnregisterPeerPresence", _myPeerId);
                Console.WriteLine("Unregistered peer presence");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Failed to unregister: {ex.Message}");
            }
        }

        if (_dataChannel != null)
        {
            _dataChannel.close();
        }

        if (_peerConnection != null)
        {
            _peerConnection.Close("normal shutdown");
            _peerConnection.Dispose();
        }

        if (_signalingConnection != null)
        {
            await _signalingConnection.DisposeAsync();
        }

        Console.WriteLine("Cleanup complete");
    }
}
