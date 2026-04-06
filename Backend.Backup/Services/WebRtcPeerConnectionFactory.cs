using Backend.Core;
using SIPSorcery.Net;
using System.Diagnostics;

namespace Backend.Backup.Services;

/// <summary>
/// Eliminates duplicated WebRTC setup logic by providing two factory methods:
/// one for the offerer (creates offer) and one for the answerer (accepts offer, creates answer).
/// Both wire ICE candidates, data channel events, and candidate buffering internally.
/// </summary>
public static class WebRtcPeerConnectionFactory
{
	/// <summary>
	/// Returned by the factory so callers can feed remote ICE candidates
	/// without worrying about whether the remote description has been set yet.
	/// Candidates that arrive early are buffered and flushed automatically.
	/// </summary>
	public sealed class PeerConnectionHandle
	{
		public RTCPeerConnection Connection { get; }
		private readonly List<RTCIceCandidateInit> _pendingCandidates = [];
		private bool _remoteDescriptionSet;
		private readonly object _lock = new();

		internal PeerConnectionHandle(RTCPeerConnection connection)
		{
			Connection = connection;
		}

		/// <summary>
		/// Adds a remote ICE candidate. Buffers internally if the remote description
		/// has not been set yet, and flushes the buffer once it is.
		/// </summary>
		public void AddRemoteCandidate(RTCIceCandidateInit candidate)
		{
			lock (_lock)
			{
				if (_remoteDescriptionSet)
				{
					Connection.addIceCandidate(candidate);
				}
				else
				{
					_pendingCandidates.Add(candidate);
				}
			}
		}

		/// <summary>
		/// Call after successfully setting the remote description.
		/// Flushes all buffered ICE candidates.
		/// </summary>
		public void OnRemoteDescriptionSet()
		{
			lock (_lock)
			{
				_remoteDescriptionSet = true;
				foreach (var c in _pendingCandidates)
					Connection.addIceCandidate(c);
				_pendingCandidates.Clear();
			}
		}
	}

	/// <summary>
	/// Builds the ICE server list from AppConfig, injecting TURN credentials
	/// for any URL starting with turn: or turns:.
	/// </summary>
	public static List<RTCIceServer> BuildIceServers(AppConfig cfg)
	{
		return [.. cfg.IceServers.Select(url =>
		{
			var server = new RTCIceServer { urls = url };
			var isTurn = url.StartsWith("turn:", StringComparison.OrdinalIgnoreCase)
					  || url.StartsWith("turns:", StringComparison.OrdinalIgnoreCase);
			if (isTurn && !string.IsNullOrEmpty(cfg.TurnUsername))
				server.username = cfg.TurnUsername;
			if (isTurn && !string.IsNullOrEmpty(cfg.TurnCredential))
				server.credential = cfg.TurnCredential;
			return server;
		})];
	}

	/// <summary>
	/// Creates a peer connection as the offerer (initiator).
	/// Returns the handle, the data channel, and the SDP offer string.
	/// </summary>
	/// <param name="cfg">App config containing ICE server URLs and TURN credentials.</param>
	/// <param name="channelName">Data channel label (e.g. "backup").</param>
	/// <param name="onIceCandidate">Called with each gathered ICE candidate JSON.</param>
	/// <param name="onDataChannelOpen">Called when the data channel opens. Receives the data channel.</param>
	/// <param name="logPrefix">Prefix for debug log lines.</param>
	public static async Task<(PeerConnectionHandle handle, RTCDataChannel dataChannel, string offerSdp)>
		CreateAsOfferer(
			AppConfig cfg,
			string channelName,
			Func<RTCIceCandidateInit, Task> onIceCandidate,
			Action<RTCDataChannel>? onDataChannelOpen = null,
			string logPrefix = "WebRTC:Offerer")
	{
		var pc = new RTCPeerConnection(new RTCConfiguration { iceServers = BuildIceServers(cfg) });
		var handle = new PeerConnectionHandle(pc);

		pc.onconnectionstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] Connection state: {state}");
		pc.onicegatheringstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] ICE gathering state: {state}");
		pc.oniceconnectionstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] ICE connection state: {state}");
		pc.onicecandidateerror += (candidate, error) =>
			Debug.WriteLine($"[{logPrefix}] ICE candidate error: {error} — candidate: {candidate?.candidate}");

		pc.onicecandidate += async (candidate) =>
		{
			if (candidate != null)
			{
				Debug.WriteLine($"[{logPrefix}] Gathered local candidate: {candidate.candidate}");
				await onIceCandidate(new RTCIceCandidateInit
				{
					candidate = candidate.candidate,
					sdpMLineIndex = candidate.sdpMLineIndex,
					sdpMid = candidate.sdpMid
				});
			}
		};

		var dataChannel = await pc.createDataChannel(channelName);

		if (onDataChannelOpen != null)
		{
			dataChannel.onopen += () =>
			{
				Debug.WriteLine($"[{logPrefix}] Data channel opened: {dataChannel.label}");
				onDataChannelOpen(dataChannel);
			};
		}

		var offer = pc.createOffer();
		await pc.setLocalDescription(offer);

		return (handle, dataChannel, offer.sdp!);
	}

	/// <summary>
	/// Creates a peer connection as the answerer (responder).
	/// Sets the remote description from the offer, creates an answer, and returns the handle and answer SDP.
	/// The data channel is created by the offerer and arrives via ondatachannel.
	/// </summary>
	/// <param name="cfg">App config containing ICE server URLs and TURN credentials.</param>
	/// <param name="offerSdp">The SDP offer from the remote offerer.</param>
	/// <param name="onIceCandidate">Called with each gathered ICE candidate.</param>
	/// <param name="onDataChannelOpen">Called when the data channel opens. Receives the data channel.</param>
	/// <param name="logPrefix">Prefix for debug log lines.</param>
	public static async Task<(PeerConnectionHandle handle, string answerSdp)?>
		CreateAsAnswerer(
			AppConfig cfg,
			string offerSdp,
			Func<RTCIceCandidateInit, Task> onIceCandidate,
			Action<RTCDataChannel>? onDataChannelOpen = null,
			string logPrefix = "WebRTC:Answerer")
	{
		var pc = new RTCPeerConnection(new RTCConfiguration { iceServers = BuildIceServers(cfg) });
		var handle = new PeerConnectionHandle(pc);

		pc.onconnectionstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] Connection state: {state}");
		pc.onicegatheringstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] ICE gathering state: {state}");
		pc.oniceconnectionstatechange += (state) =>
			Debug.WriteLine($"[{logPrefix}] ICE connection state: {state}");
		pc.onicecandidateerror += (candidate, error) =>
			Debug.WriteLine($"[{logPrefix}] ICE candidate error: {error} — candidate: {candidate?.candidate}");

		pc.onicecandidate += async (candidate) =>
		{
			if (candidate != null)
			{
				Debug.WriteLine($"[{logPrefix}] Gathered local candidate: {candidate.candidate}");
				await onIceCandidate(new RTCIceCandidateInit
				{
					candidate = candidate.candidate,
					sdpMLineIndex = candidate.sdpMLineIndex,
					sdpMid = candidate.sdpMid
				});
			}
		};

		if (onDataChannelOpen != null)
		{
			pc.ondatachannel += (dc) =>
			{
				if (dc.readyState == RTCDataChannelState.open)
				{
					Debug.WriteLine($"[{logPrefix}] Data channel opened: {dc.label}");
					onDataChannelOpen(dc);
				}
				else
				{
					dc.onopen += () =>
					{
						Debug.WriteLine($"[{logPrefix}] Data channel opened: {dc.label}");
						onDataChannelOpen(dc);
					};
				}
			};
		}

		// Set remote description (the offer)
		var offer = new RTCSessionDescriptionInit { type = RTCSdpType.offer, sdp = offerSdp };
		var result = pc.setRemoteDescription(offer);
		if (result != SetDescriptionResultEnum.OK)
		{
			Debug.WriteLine($"[{logPrefix}] Failed to set remote description: {result}");
			pc.close();
			return null;
		}

		handle.OnRemoteDescriptionSet();

		// Create and set answer
		var answer = pc.createAnswer();
		await pc.setLocalDescription(answer);

		return (handle, answer.sdp!);
	}

	/// <summary>
	/// Sets the remote description (answer) on the offerer's peer connection.
	/// Returns true on success.
	/// </summary>
	public static bool SetRemoteAnswer(PeerConnectionHandle handle, string answerSdp, string logPrefix = "WebRTC:Offerer")
	{
		var answer = new RTCSessionDescriptionInit { type = RTCSdpType.answer, sdp = answerSdp };
		var result = handle.Connection.setRemoteDescription(answer);
		if (result != SetDescriptionResultEnum.OK)
		{
			Debug.WriteLine($"[{logPrefix}] Failed to set remote description: {result}");
			return false;
		}
		handle.OnRemoteDescriptionSet();
		return true;
	}
}
