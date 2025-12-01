import { useApiClient } from "./Hooks/useApiClient"

// Pairing service for WebRTC P2P connections
export interface GenerateCodeResponse {
	code: string
	peerId: string
	expiresAt: string
}

export interface UseCodeResponse {
	success: boolean
	peerId: string
	target: string
	message: string
}

export interface PairingSession {
	code?: string
	remotePeerId?: string
	isConnected: boolean
	hasActiveSession: boolean
	isExpired?: boolean
	expiresAt?: string
}

export interface PairedPeerInfo {
	id: number
	name: string
	target: string
	remotePeerId: string
	pairedAt: string
	isInitiator: boolean
}

export interface CompletePairingRequest {
	peerId: string
	peerName?: string
}

export interface RecoveryCodeResponse {
	code: string
	expiresAt: string
	tenantId: number
	availableBackupCount: number
}

export const usePairingService = () => {
	const apiClient = useApiClient()

	return {
		async generateCode(): Promise<GenerateCodeResponse> {
			try {
				const response = await apiClient.post<GenerateCodeResponse>("/api/pairing/generate-code", {})
				if (!response) {
					throw new Error("Failed to generate pairing code")
				}
				return response
			} catch (error) {
				console.error("Error generating pairing code:", error)
				throw error
			}
		},

		async useCode(code: string): Promise<UseCodeResponse> {
			try {
				const response = await apiClient.post<UseCodeResponse>("/api/pairing/use-code", { code })
				if (!response) {
					throw new Error("Failed to use pairing code")
				}
				return response
			} catch (error) {
				console.error("Error using pairing code:", error)
				throw error
			}
		},

		async getStatus(): Promise<PairingSession | null> {
			try {
				const response = await apiClient.get<PairingSession>("/api/pairing/status")
				return response || null
			} catch (error) {
				// Don't log 404s as errors - just means no active session
				if ((error as any)?.response?.status !== 404) {
					console.error("Error fetching pairing status:", error)
				}
				return null
			}
		},

		async cancelPairing(): Promise<void> {
			try {
				await apiClient.delete("/api/pairing/cancel", {})
			} catch (error) {
				console.error("Error canceling pairing:", error)
				throw error
			}
		},

		async completePairing(request: CompletePairingRequest): Promise<void> {
			try {
				await apiClient.post("/api/pairing/complete", request)
			} catch (error) {
				console.error("Error completing pairing:", error)
				throw error
			}
		},

		async getPairedPeers(): Promise<PairedPeerInfo[]> {
			try {
				const response = await apiClient.get<PairedPeerInfo[]>("/api/pairing/paired-peers")
				return response || []
			} catch (error) {
				console.error("Error fetching paired peers:", error)
				return []
			}
		},

		async deletePairedPeer(id: number): Promise<void> {
			try {
				await apiClient.delete(`/api/pairing/paired-peers/${id}`, {})
			} catch (error) {
				console.error("Error deleting paired peer:", error)
				throw error
			}
		},

		async generateRecoveryCode(): Promise<RecoveryCodeResponse> {
			try {
				const response = await apiClient.post<RecoveryCodeResponse>("/api/pairing/generate-recovery-code", {})
				if (!response) {
					throw new Error("Failed to generate recovery code")
				}
				return response
			} catch (error) {
				console.error("Error generating recovery code:", error)
				throw error
			}
		},

		async useRecoveryCode(code: string): Promise<UseCodeResponse> {
			try {
				const response = await apiClient.post<UseCodeResponse>("/api/pairing/use-recovery-code", { code })
				if (!response) {
					throw new Error("Failed to use recovery code")
				}
				return response
			} catch (error) {
				console.error("Error using recovery code:", error)
				throw error
			}
		}
	}
}
