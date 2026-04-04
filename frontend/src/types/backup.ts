// Backup-related TypeScript interfaces and types

export enum BackupStatus {
	Running = "Running",
	Success = "Success",
	Failed = "Failed",
	Pending = "Pending",
	Paused = "Paused",
	Scheduled = "Scheduled"
}

export interface BackupDestination {
	id: number
	name: string
	target: string // Backend target identifier (e.g. "webrtc:1")
	type: "WebRTC" | "Local" | "Cloud"
	status: BackupStatus
	lastBackup?: Date
	nextBackup?: Date
	itemsBackedUp: number
	totalSize: number
	enabled: boolean
	isConnected?: boolean // WebRTC connection status
}

export interface BackupItem {
	id: number
	name: string
	type: "File" | "Folder" | "Database"
	size: number
	status: BackupStatus
	startedAt: Date
	completedAt?: Date
	duration?: number  // in seconds
	error?: string
}

export interface BackupRun {
	id: number
	destinationId: number
	destinationName: string
	startedAt: Date
	completedAt?: Date
	status: BackupStatus
	itemsTotal: number
	itemsCompleted: number
	totalSize: number
	transferredSize: number
	items: BackupItem[]
	error?: string
}

export interface BackupSchedule {
	id: number
	destinationId: number
	enabled: boolean
	frequency: "Hourly" | "Daily" | "Weekly" | "Monthly"
	time?: string // HH:mm format
	dayOfWeek?: number // 0-6 for weekly
	dayOfMonth?: number // 1-31 for monthly
	lastRun: Date | null
	nextRun: Date | null
}
