import React, { useState, useEffect, useRef } from "react"
import { usePairingService } from "../../Utils/PairingService"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheckCircle, faClock, faLock, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { useSignalR } from "../../Utils/Hooks/useSignalR"
import { Dialog } from "../Dialog"

type WebRTCPairingDialogProps = {
	onClose: () => void
	onPairingComplete: () => void
}
export const WebRTCPairingDialog = ({onClose, onPairingComplete} : WebRTCPairingDialogProps) => {
	const [mode, setMode] = useState<"generate" | "join" | null>(null)
	const [pairingCode, setPairingCode] = useState("")
	const [inputCode, setInputCode] = useState("")
	const [deviceName, setDeviceName] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	
	// Use ref to track current pairing code for SignalR callback
	const pairingCodeRef = useRef<string>("")
	
	const pairingService = usePairingService()

	// Update ref whenever pairingCode changes
	useEffect(() => {
		pairingCodeRef.current = pairingCode
	}, [pairingCode])

	// Listen for pairing connection via SignalR
	useSignalR((message) => {
		if (message.messageType === "PairingConnected" && message.data) {
			const { code, remotePeerId } = message.data
			if (pairingCodeRef.current === code && remotePeerId) {
				handlePairingConnected(remotePeerId, code)
			}
		}
	})

	const handlePairingConnected = async (remotePeerId: string, code: string) => {
		try {
			setIsConnected(true)
			
			// Save paired peer to database with custom name
			const peerName = deviceName.trim() || `Peer ${code}`
			await pairingService.completePairing({
				peerId: remotePeerId,
				peerName
			})
			
			// Notify parent and close modal
			setTimeout(() => {
				onPairingComplete()
				onClose()
			}, 1500) // Show success state briefly
		} catch (err) {
			console.error("Error completing pairing:", err)
			setError("Failed to save pairing. Please try again.")
		}
	}

	const handleGenerateCode = async () => {
		setIsLoading(true)
		setError(null)
		
		try {
			const response = await pairingService.generateCode()
			
			if (!response || !response.code) {
				throw new Error("Invalid response from pairing service")
			}
			
			setPairingCode(response.code)
			setMode("generate")
		} catch (error) {
			console.error("Generate code error:", error)
			setError("Failed to generate pairing code")
		} finally {
			setIsLoading(false)
		}
	}

	const handleJoinPairing = async () => {
		if (!inputCode || inputCode.length !== 6) {
			setError("Please enter a valid 6-digit code")
			return
		}

		setIsLoading(true)
		setError(null)
		
		try {
			await pairingService.useCode(inputCode)
			setPairingCode(inputCode)
			setMode("join")
			setIsConnected(true)
			
			// Close modal after success
			setTimeout(() => {
				onPairingComplete()
				onClose()
			}, 1500)
		} catch {
			setError("Failed to join pairing. Code may be invalid or expired.")
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancel = async () => {
		if (mode === "generate" && pairingCode) {
			try {
				await pairingService.cancelPairing()
			} catch {
				// Ignore errors on cancel
			}
		}
		onClose()
	}

	return (
		<Dialog onClose={() => handleCancel()} closeOnEscape={true}>		
			
			<div className="dialog-header">
				Pair device
			</div>

			<div className="dialog-content">
				{error && (
					<div className="error-message">
						{error}
					</div>
				)}

				{!mode && (
					<>
						<div className="info-box">
							<h3>
								<FontAwesomeIcon icon={faLock} className="mr-2" />
								Secure peer-to-peer pairing
							</h3>
							<p>
								Pair this device with another to enable secure backups 
								without opening firewall ports. Both devices will exchange 
								a secure code to establish a direct connection.
							</p>
						</div>

						<div className="form-group">
							<label>Device name (Optional)</label>
							<input
								type="text"
								value={deviceName}
								onChange={(e) => setDeviceName(e.target.value)}
								placeholder="e.g., John's Laptop"
								maxLength={50}
							/>
							<div className="input-hint">
								Give this pairing a friendly name for easy identification
							</div>
						</div>

						<div className="flex gap-3 mb-6 flex-1">
							<button onClick={() => setMode("join")}
								className="btn btn-secondary">
									Join with code
								<br />
								<small>(My backup destinations)</small>
							</button>
							<button 
								className="btn btn-secondary"
								onClick={handleGenerateCode}
								disabled={isLoading}
							>
								{isLoading ?
									<>
										<FontAwesomeIcon icon={faSpinner} spinPulse className="mr-2" />
										Generating...
									</> :
									<>
										Generate Code
										<br />
										<small>(Peers backing up to me)</small>
									</>
								}
							</button>
						</div>
						<div className="todo">
							//TODO: Simplify UX
							<ul>
								<li>// - Any party can generate code or enter code</li>
								<li>// - Ask user which direction(s) to sync</li>
								<li>// - Countdown the expiration time of the code</li>
								<li>// - Allow navigating away while waiting to pair</li>
								<li>// - List pending invitations</li>
							</ul>
						</div>

					</>
				)}

				{mode === "generate" && (
					<>
						<div className="info-box">
							<h3>Share this code</h3>
							<p>
								Enter this 6-digit code on the other device to complete pairing. 
								Code expires in 5 minutes.
							</p>
						</div>

						<div className="code-display">
							<div className="code-label">Pairing code</div>
							<div className="code-value">{pairingCode}</div>
						</div>

						{isConnected ? (
							<div className="pairing-status connected">
								<FontAwesomeIcon icon={faCheckCircle} /> Connected! Pairing complete.
							</div>
						) : (
							<div className="pairing-status">
								<FontAwesomeIcon icon={faSpinner} spinPulse /> Waiting for other device to join...
							</div>
						)}
					</>
				)}

				{mode === "join" && !isConnected && (
					<>
						<div className="info-box">
							<h3>Enter pairing code</h3>
							<p>Enter the 6-digit code displayed on the other device.</p>
						</div>

						<div className="form-group">
							<label>Pairing code</label>
							<input
								type="text"
								value={inputCode}
								onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
								placeholder="000000"
								maxLength={6}
								style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.2em" }}
								autoFocus
							/>
						</div>
					</>
				)}

				{mode === "join" && isConnected && (
					<div className="connection-status connected">
						<FontAwesomeIcon icon={faCheckCircle} /> Connected! Pairing complete.
					</div>
				)}
			</div>

			{!isConnected && (
				<div className="dialog-footer flex gap-2">
					<div className="flex-1"></div>
					<button 
						className="btn btn-secondary" 
						onClick={handleCancel}
						disabled={isLoading}
					>
							Cancel
					</button>

					{mode === "join" && (
						<button 
							className="btn btn-primary" 
							onClick={handleJoinPairing}
							disabled={isLoading || inputCode.length !== 6}
						>
							{isLoading ? (
								<>
									<span className="spinner"></span>
										Connecting...
								</>
							) : (
								"Pair device"
							)}
						</button>
					)}
				</div>
			)}
		</Dialog>
	)
}
