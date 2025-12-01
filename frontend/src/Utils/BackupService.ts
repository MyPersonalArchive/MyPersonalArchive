import { useApiClient } from "./Hooks/useApiClient"

export interface BackupStatus {
	status: number
	lastBackupTime?: string
	nextBackupTime?: string
}

export interface RestoreStatus {
	isRestoring: boolean
	status: string
	filesRestored: number
	totalFiles: number
	currentFile?: string
	errorMessage?: string
}

export interface BackupFile {
	name: string
	size?: number
	createdAt?: string
}

export interface BackupLog {
	id: number
	itemType: string
	itemId: number
	itemName: string
	itemLastUpdated: string
	startedAt: string
	completedAt?: string
	status: number
	errorMessage?: string
	fileSizeBytes?: number
	backupFileName: string
	targetSystem: string
	targetType: string
}

export interface BackupLogsResponse {
	logs: BackupLog[]
	totalCount: number
	page: number
	pageSize: number
	totalPages: number
}

export interface BackupRunInfo {
	timestamp: string
	runDate: string
	totalItems: number
	successfulItems: number
	failedItems: number
	fileSizeKB: number
}

export interface PairedPeerInfo {
	id: number
	name: string
	target: string
	remotePeerId: string
	pairedAt: string
	isInitiator: boolean
	role: "Source" | "Destination"
	isConnected: boolean
}

export interface ReconnectionRequest {
	destinationId: number
}

export interface TenantBackupConfig {
	tenantId: number
	intervalMinutes: number
	lastUpdated: string
}

export const useBackupService = () => {
	const apiClient = useApiClient()

	return {
		async startBackup(target: string, password: string, providerName: string, encryptionMode: string): Promise<void> {
			try {
				await apiClient.post("/api/backup/startbackup", { target, password, providerName, encryptionMode })
			} catch (error) {
				console.error("Error starting backup:", error)
				throw error
			}
		},

		async stopBackup(): Promise<void> {
			try {
				await apiClient.post("/api/backup/stopbackup", {})
			} catch (error) {
				console.error("Error stopping backup:", error)
				throw error
			}
		},

		async getBackupStatus(): Promise<BackupStatus | null> {
			try {
				return await apiClient.get<BackupStatus>("/api/backup/BackupInformation") || null
			} catch (error) {
				console.error("Error fetching backup status:", error)
				throw error
			}
		},

		async getBackupFiles(tenantId: number): Promise<BackupFile[]> {
			try {
				return await apiClient.get<BackupFile[]>("/api/backup/list", { tenantId }) || []
			} catch (error) {
				console.error("Error fetching backup files:", error)
				throw error
			}
		},

		async getBackupLogs(page: number = 1, pageSize: number = 20, status?: string, timestamp?: string): Promise<BackupLogsResponse> {
			try {
				const params: Record<string, any> = { page, pageSize }
				if (status) {
					params.status = status
				}
				if (timestamp) {
					params.timestamp = timestamp
				}
				return await apiClient.get<BackupLogsResponse>("/api/backup/logs", params) || {
					logs: [],
					totalCount: 0,
					page: 1,
					pageSize: 20,
					totalPages: 0
				}
			} catch (error) {
				console.error("Error fetching backup logs:", error)
				throw error
			}
		},

		async getAvailableBackupLogs(): Promise<BackupRunInfo[]> {
			try {
				return await apiClient.get<BackupRunInfo[]>("/api/backup/log-history") || []
			} catch (error) {
				console.error("Error fetching available backup runs:", error)
				throw error
			}
		},

		async getPairedPeers(): Promise<PairedPeerInfo[]> {
			try {
				return await apiClient.get<PairedPeerInfo[]>("/api/pairing/paired-peers") || []
			} catch (error) {
				console.error("Error fetching paired peers:", error)
				throw error
			}
		},

		async requestReconnection(destinationId: number): Promise<void> {
			try {
				await apiClient.post(`/api/pairing/reconnect/${destinationId}`, {})
			} catch (error) {
				console.error("Error requesting reconnection:", error)
				throw error
			}
		},

		async deletePairedPeer(destinationId: number): Promise<void> {
			try {
				await apiClient.delete(`/api/pairing/paired-peers/${destinationId}`, {})
			} catch (error) {
				console.error("Error deleting paired peer:", error)
				throw error
			}
		},

		async checkConnectivity(destinationId: number): Promise<boolean> {
			try {
				const result = await apiClient.post<{ isConnected: boolean }>(`/api/pairing/check-connectivity/${destinationId}`, {})
				return result?.isConnected ?? false
			} catch (error) {
				console.error(`Error checking connectivity for destination ${destinationId}:`, error)
				return false
			}
		},

		async setBackupInterval(intervalMinutes: number): Promise<void> {
			try {
				await apiClient.post("/api/backup/set-backup-interval", { intervalMinutes })
			} catch (error) {
				console.error("Error setting backup interval:", error)
				throw error
			}
		},

		async getBackupInterval(): Promise<TenantBackupConfig> {
			try {
				return await apiClient.get<TenantBackupConfig>("/api/backup/get-backup-interval") || {
					tenantId: 0,
					intervalMinutes: 1440,
					lastUpdated: new Date().toISOString()
				}
			} catch (error) {
				console.error("Error getting backup interval:", error)
				throw error
			}
		},

		async startRestore(password: string, target: string | null): Promise<void> {
			try {
				await apiClient.post("/api/restore/startrestore", { password, target })
			} catch (error) {
				console.error("Error starting restore:", error)
				throw error
			}
		},

		async stopRestore(): Promise<void> {
			try {
				await apiClient.post("/api/restore/stoprestore", {})
			} catch (error) {
				console.error("Error stopping restore:", error)
				throw error
			}
		},

		async getRestoreStatus(): Promise<RestoreStatus | undefined> {
			try {
				return await apiClient.get<RestoreStatus>("/api/restore/status")
			} catch (error) {
				console.error("Error getting restore status:", error)
				throw error
			}
		}
	}
}