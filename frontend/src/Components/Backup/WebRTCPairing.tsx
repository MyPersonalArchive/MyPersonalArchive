import React, { useState, useEffect } from "react"
import { PairedPeerInfo, usePairingService } from "../../Utils/PairingService"
import { WebRTCPairingDialog } from "./WebRTCPairingDialog"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck } from "@fortawesome/free-solid-svg-icons"

interface WebRTCPairingProps {
	onPairingCodeChange: (code: string) => void
	disabled: boolean
}

export const WebRTCPairing: React.FC<WebRTCPairingProps> = ({ onPairingCodeChange, disabled }) => {
	const [error, setError] = useState<string | null>(null)
	const [pairedPeers, setPairedPeers] = useState<PairedPeerInfo[]>([])
	const [selectedPeer, setSelectedPeer] = useState<number | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	
	const pairingService = usePairingService()

	const loadPairedPeers = async () => {
		try {
			const peers = await pairingService.getPairedPeers()
			setPairedPeers(peers)
		} catch (error) {
			console.error("Failed to load paired peers:", error)
		}
	}

	// Load paired peers on mount
	useEffect(() => {
		let mounted = true
		const loadData = async () => {
			try {
				const peers = await pairingService.getPairedPeers()
				if (mounted) {
					setPairedPeers(peers)
				}
			} catch (error) {
				console.error("Failed to load paired peers:", error)
			}
		}
		void loadData()
		return () => {
			mounted = false
		}
	}, [])

	const handleSelectPeer = (peer: PairedPeerInfo) => {
		setSelectedPeer(peer.id)
		onPairingCodeChange(peer.target)
	}

	const handleDeletePeer = async (peerId: number, peerName: string) => {
		if (!confirm(`Are you sure you want to remove pairing with "${peerName}"?`)) {
			return
		}

		try {
			await pairingService.deletePairedPeer(peerId)
			await loadPairedPeers()
			if (selectedPeer === peerId) {
				setSelectedPeer(null)
				onPairingCodeChange("")
			}
		} catch {
			setError("Failed to delete paired peer")
		}
	}

	const handlePairingComplete = () => {
		loadPairedPeers()
	}

	return (
		<div className="webrtc-pairing">
			<header className="header">
				<h4>WebRTC P2P Backup</h4>
			</header>
			<p className="pairing-description">
				{pairedPeers.length > 0 
					? "Select a paired device or add a new one" 
					: "Connect to another device peer-to-peer without opening firewall ports"
				}
			</p>
			
			{pairedPeers.length > 0 && (
				<div className="p-4 bg-white rounded-lg border border-gray-200">
					<header className="header">
						<h5>Paired Devices</h5>
					</header>
					{pairedPeers.map(peer => (
						<div 
							key={peer.id}
							className={`peer-item ${selectedPeer === peer.id ? "selected" : ""}`}
						>
							<div className="peer-content" onClick={() => handleSelectPeer(peer)}>
								<div>
									<span className="peer-name">{peer.name}</span>
									<span className="peer-date">
										Paired {new Date(peer.pairedAt).toLocaleDateString()}
									</span>
									{selectedPeer === peer.id && (
										<span className="peer-selected-indicator"><FontAwesomeIcon icon={faCheck} /></span>
									)}
								</div>
								
							</div>
							<button 
								className="btn btn-seondary"
								onClick={(e) => {
									e.stopPropagation()
									handleDeletePeer(peer.id, peer.name)
								}}
								title="Remove this peer"
							>
								Revoke
							</button>
						</div>
					))}
				</div>
			)}
			
			<div className="flex gap-2">
				<button 
				
					onClick={() => setIsModalOpen(true)}
					disabled={disabled}
					className="btn btn-primary"
				>
					Add New Peer
				</button>
			</div>

			{error && <div className="error-message">{error}</div>}

			<WebRTCPairingDialog
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				onPairingComplete={handlePairingComplete}
			/>
		</div>
	)
}
