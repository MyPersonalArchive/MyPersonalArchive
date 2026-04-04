import { useState, useEffect } from "react"
import { TopActionBar } from "./TopActionBar"
import { BackupTable } from "./BackupTable"
import { BackupDetailsDialog } from "./BackupDetailsDialog"
import { WebRTCPairingDialog } from "./WebRTCPairingDialog"
import { BackupIntervalDialog } from "./BackupIntervalDialog"
import { RecoveryDialog } from "./RecoveryDialog"
import { BackupDestination, BackupRun, BackupStatus, BackupItem } from "../../types/backup"
import { useBackupService, PairedPeerInfo, BackupLog, RestoreStatus } from "../../Utils/BackupService"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheckCircle, faTimesCircle, faRotate, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { useSignalR } from "../../Utils/Hooks/useSignalR"

// Helper function to convert backend status to UI status
function mapBackupStatus(backendStatus: number): BackupStatus {
	switch (backendStatus) {
		case 0: return BackupStatus.Pending
		case 1: return BackupStatus.Running
		case 2: return BackupStatus.Success
		case 3: return BackupStatus.Failed
		default: return BackupStatus.Pending
	}
}

// Convert PairedPeerInfo to BackupDestination
function peerToDestination(peer: PairedPeerInfo, logs: BackupLog[]): BackupDestination {
	const peerLogs = logs.filter(log => log.targetSystem === peer.target)
	const lastLog = peerLogs.length > 0 ? peerLogs[0] : null
	const successfulBackups = peerLogs.filter(log => log.status === 2)
	
	const itemsBackedUp = successfulBackups.reduce((sum) => sum + 1, 0)
	const totalSize = peerLogs.reduce((sum, log) => sum + (log.fileSizeBytes || 0), 0)
	
	return {
		id: peer.id,
		name: peer.name,
		target: peer.target,
		type: "WebRTC",
		status: lastLog ? mapBackupStatus(lastLog.status) : BackupStatus.Scheduled,
		lastBackup: lastLog?.completedAt ? new Date(lastLog.completedAt) : undefined,
		nextBackup: undefined, // No scheduling yet
		itemsBackedUp,
		totalSize,
		enabled: true,
		isConnected: peer.isConnected
	}
}

// Convert BackupLog to BackupItem
function logToBackupItem(log: BackupLog): BackupItem {
	const startedAt = new Date(log.startedAt)
	const completedAt = log.completedAt ? new Date(log.completedAt) : undefined
	const duration = completedAt ? (completedAt.getTime() - startedAt.getTime()) / 1000 : undefined
	
	return {
		id: log.id,
		name: log.itemName,
		type: "File", // Could be enhanced based on itemType
		size: log.fileSizeBytes || 0,
		status: mapBackupStatus(log.status),
		startedAt,
		completedAt,
		duration,
		error: log.errorMessage
	}
}

export function BackupView() {
	const [outboundDestinations, setOutboundDestinations] = useState<BackupDestination[]>([])
	const [inboundPeers, setInboundPeers] = useState<BackupDestination[]>([])
	const [selectedBackupRun, setSelectedBackupRun] = useState<BackupRun | null>(null)
	const [isBackupRunning, setIsBackupRunning] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isPairingModalOpen, setIsPairingModalOpen] = useState(false)
	const [isIntervalModalOpen, setIsIntervalModalOpen] = useState(false)
	const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false)
	const [backupInterval, setBackupInterval] = useState(1440) // default 24 hours
	const [restoreStatus, setRestoreStatus] = useState<RestoreStatus | null>(null)
	const backupService = useBackupService()

	// Load initial data
	useEffect(() => {
		loadDestinations()
		loadBackupInterval()
		checkRestoreStatus()
	}, [])

	// SignalR real-time updates
	useSignalR(message => {
		switch (message.messageType) {
			case "BackupStarted": {
				console.log("Backup started:", message.data)
				const target = message.data.Target
				// Update destination status to Running
				setOutboundDestinations(prev =>
					prev.map(d => d.target === target ? { ...d, status: BackupStatus.Running } : d)
				)
				break
			}
			case "BackupCompleted": {
				console.log("Backup completed, refreshing destinations...")
				loadDestinations()
				setIsBackupRunning(false)
				break
			}
			case "BackupFailed": {
				console.log("Backup failed:", message.data)
				const target = message.data.Target || message.data.target
				console.log("Target from message:", target)
				console.log("Current destinations:", outboundDestinations.map(d => ({ id: d.id, name: d.name, target: d.target, status: d.status })))
				// Update destination status to Failed
				setOutboundDestinations(prev => {
					const updated = prev.map(d => {
						if (d.target === target) {
							console.log(`Updating destination ${d.name} (${d.target}) to Failed`)
							return { ...d, status: BackupStatus.Failed }
						}
						return d
					})
					console.log("Updated destinations:", updated.map(d => ({ id: d.id, name: d.name, target: d.target, status: d.status })))
					return updated
				})
				setIsBackupRunning(false)
				break
			}
			case "BackupProgress": {
				// Could update progress indicators
				console.log("Backup progress:", message.data)
				break
			}
			case "RestoreProgress": {
				setRestoreStatus({
					isRestoring: message.data.status !== "Finished" && message.data.status !== "Failed",
					status: message.data.status,
					filesRestored: message.data.filesRestored || 0,
					totalFiles: message.data.totalFiles || 0,
					currentFile: message.data.currentFile || "",
					errorMessage: message.data.errorMessage
				})
				
				// If finished or failed, clear the status after a brief delay
				if (message.data.status === "Finished" || message.data.status === "Failed") {
					setTimeout(() => {
						setRestoreStatus(null)
					}, 5000) // Show result for 5 seconds (longer for errors)
				}
				break
			}
		}
	})

	async function loadDestinations() {
		try {
			setIsLoading(true)
			const [peers, logsResponse] = await Promise.all([
				backupService.getPairedPeers(),
				backupService.getBackupLogs(1, 100) // Get recent logs
			])
			
			// Separate outbound (I backup TO them) and inbound (they backup TO me)
			const outbound = peers
				.filter(peer => peer.role === "Source")
				.map(peer => peerToDestination(peer, logsResponse.logs))
			
			const inbound = peers
				.filter(peer => peer.role === "Destination")
				.map(peer => peerToDestination(peer, logsResponse.logs))
			
			setOutboundDestinations(outbound)
			setInboundPeers(inbound)
			
			// Check connectivity for all outbound destinations in background
			checkDestinationsConnectivity(outbound)
		
			// Check backup status
			const status = await backupService.getBackupStatus()
			setIsBackupRunning(status?.status === 1)
		} catch (error) {
			console.error("Error loading destinations:", error)
		} finally {
			setIsLoading(false)
		}
	}

	async function checkDestinationsConnectivity(destinations: BackupDestination[]) {
		for (const dest of destinations) {
			if (dest.type === "WebRTC") {
				try {
					const isConnected = await backupService.checkConnectivity(dest.id)
				
					// Update the destination's connection status
					setOutboundDestinations(prev => 
						prev.map(d => d.id === dest.id ? { ...d, isConnected } : d)
					)
				} catch (error) {
					console.error(`Failed to check connectivity for ${dest.name}:`, error)
				}
			}
		}
	}

	async function loadBackupInterval() {
		try {
			const config = await backupService.getBackupInterval()
			setBackupInterval(config.intervalMinutes)
		} catch (error) {
			console.error("Error loading backup interval:", error)
		}
	}

	async function checkRestoreStatus() {
		try {
			const status = await backupService.getRestoreStatus()
			// Always update the status, even if not currently restoring
			// This ensures we show the correct state on page refresh
			if (status && status.status !== "NotStarted") {
				// Normalize isRestoring - if status is Finished or Failed, treat as not restoring
				const normalizedStatus = {
					...status,
					isRestoring: status.status !== "Finished" && status.status !== "Failed"
				}
				setRestoreStatus(normalizedStatus)
				
				// Auto-clear finished/failed status after brief delay
				if (status.status === "Finished" || status.status === "Failed") {
					setTimeout(() => {
						setRestoreStatus(null)
					}, 5000) // 5 seconds for errors so user can read
				}
			} else {
				// No active or recent restore
				setRestoreStatus(null)
			}
		} catch (error) {
			console.error("Error checking restore status:", error)
		}
	}

	const handleStartBackup = async () => {
		if (outboundDestinations.length === 0) {
			alert("No backup destinations configured. Please pair with another instance first.")
			return
		}
		
		try {
			// Use first destination for now
			const firstDestination = outboundDestinations[0]
			
			// Set status to Pending immediately
			setOutboundDestinations(prev =>
				prev.map(d => d.id === firstDestination.id ? { ...d, status: BackupStatus.Pending } : d)
			)
			
			await backupService.startBackup(firstDestination.target, "", "WebRTC", "None")
			setIsBackupRunning(true)
		} catch (error) {
			console.error("Failed to start backup:", error)
			// Reset status on error
			loadDestinations()
			alert("Failed to start backup")
		}
	}

	const handleStopBackup = async () => {
		try {
			await backupService.stopBackup()
			setIsBackupRunning(false)
		} catch (error) {
			console.error("Failed to stop backup:", error)
			alert("Failed to stop backup")
		}
	}

	const handleSchedule = () => {
		setIsIntervalModalOpen(true)
	}

	const handleSaveInterval = async (intervalMinutes: number) => {
		await backupService.setBackupInterval(intervalMinutes)
		setBackupInterval(intervalMinutes)
	}

	const handleNewTarget = () => {
		setIsPairingModalOpen(true)
	}

	const handleViewDetails = async (destinationId: number) => {
		try {
			// Fetch logs for this specific destination - check both lists
			const destination = [...outboundDestinations, ...inboundPeers].find(d => d.id === destinationId)
			if (!destination) return
			
			const logsResponse = await backupService.getBackupLogs(1, 100)
			const destinationLogs = logsResponse.logs.filter(log => log.targetSystem === destination.target)
			
			if (destinationLogs.length === 0) {
				alert("No backup history for this destination")
				return
			}
			
			// Group logs by timestamp/run
			const items = destinationLogs.map(logToBackupItem)
			const firstLog = destinationLogs[0]
			const lastLog = destinationLogs[destinationLogs.length - 1]
			
			const backupRun: BackupRun = {
				id: destinationId,
				destinationId: destination.id,
				destinationName: destination.name,
				startedAt: new Date(firstLog.startedAt),
				completedAt: lastLog.completedAt ? new Date(lastLog.completedAt) : undefined,
				status: destination.status,
				itemsTotal: items.length,
				itemsCompleted: items.filter(i => i.status === BackupStatus.Success).length,
				totalSize: items.reduce((sum, i) => sum + i.size, 0),
				transferredSize: items.filter(i => i.status === BackupStatus.Success).reduce((sum, i) => sum + i.size, 0),
				items
			}
			
			setSelectedBackupRun(backupRun)
		} catch (error) {
			console.error("Error loading backup details:", error)
			alert("Failed to load backup details")
		}
	}

	const handleRunBackup = async (destinationId: number) => {
		try {
			// Find the destination
			const destination = outboundDestinations.find(d => d.id === destinationId)
			if (!destination) return
			
			// Set status to Pending immediately
			setOutboundDestinations(prev =>
				prev.map(d => d.id === destinationId ? { ...d, status: BackupStatus.Pending } : d)
			)
			
			// Start the backup
			await backupService.startBackup(destination.target, "", "WebRTC", "None")
			setIsBackupRunning(true)
		} catch (error) {
			console.error("Failed to run backup:", error)
			// Reset status on error
			loadDestinations()
			alert("Failed to run backup")
		}
	}

	const handleDeleteDestination = async (destinationId: number) => {
		if (!confirm("Are you sure you want to remove this backup destination?")) {
			return
		}
		
		try {
			await backupService.deletePairedPeer(destinationId)
			await loadDestinations() // Refresh list
		} catch (error) {
			console.error("Failed to delete destination:", error)
			alert("Failed to delete destination")
		}
	}

	const handleRecovery = () => {
		setIsRecoveryModalOpen(true)
	}

	return (
		<>
			<header className="header">
				<h1>Backup and external sync</h1>
			</header>
			
			{/* Restore Progress Overlay */}
			{restoreStatus && (restoreStatus.isRestoring || restoreStatus.status === "Finished") && (
				<div className="fixed inset-0 bg-opacity-50 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(4px)" }}>
					<div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
						<h2 className="text-2xl font-bold mb-4 text-center">
							{restoreStatus.status === "Finished" 
								? <><FontAwesomeIcon icon={faCheckCircle} /> Restore Complete!</> 
								: restoreStatus.status === "Failed" 
									? <><FontAwesomeIcon icon={faTimesCircle} /> Restore Failed</> 
									: <><FontAwesomeIcon icon={faSpinner} spinPulse /> Restoring Data</>
							}
						</h2>
						<p className="text-gray-600 mb-6 text-center">
							{restoreStatus.status === "Finished" 
								? "Your data has been successfully restored."
								: restoreStatus.status === "Failed"
									? restoreStatus.errorMessage || "An error occurred during restore."
									: "Please wait while we restore your data. Do not close this window."
							}
						</p>
					
						<div className="mb-4">
							<div className="flex justify-between text-sm text-gray-600 mb-2">
								<span>Progress</span>
								<span>{restoreStatus.filesRestored ?? 0} / {restoreStatus.totalFiles ?? 0} files</span>
							</div>
							<div className="w-full bg-gray-200 rounded-full h-3">
								<div 
									className={`h-3 rounded-full transition-all duration-300 ${
										restoreStatus.status === "Finished" 
											? "bg-green-600" 
											: restoreStatus.status === "Failed" 
												? "bg-red-600" 
												: "bg-blue-600"
									}`}
									style={{ width: `${(restoreStatus.totalFiles ?? 0) > 0 ? ((restoreStatus.filesRestored ?? 0) / (restoreStatus.totalFiles ?? 1) * 100) : 0}%` }}
								></div>
							</div>
						</div>

						{restoreStatus.currentFile && restoreStatus.status === "InProgress" && (
							<div className="text-sm text-gray-500 text-center mb-4">
								<span className="font-mono">{restoreStatus.currentFile}</span>
							</div>
						)}

						{restoreStatus.status === "InProgress" && (
							<div className="text-blue-600">
								<FontAwesomeIcon icon={faSpinner} spinPulse className="text-blue-600 mr-2" />
								<span className="text-sm">Restoring...</span>
							</div>
						)}
					</div>
				</div>
			)}

			<TopActionBar
				onStartBackup={handleStartBackup}
				onStopBackup={handleStopBackup}
				onSchedule={handleSchedule}
				onNewTarget={handleNewTarget}
				onRecovery={handleRecovery}
				isBackupRunning={isBackupRunning}
			/>

			{/* Section 1: My Backup Destinations (Outbound) */}
			<div>
				<header className="header mt-6">
					<h2>My backup destinations</h2>
					<div>Destinations where I send my backups</div>
				</header>

				{isLoading ? (
					<div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
						<div className="text-gray-500">Loading backup destinations...</div>
					</div>
				) : (
					<BackupTable
						destinations={outboundDestinations}
						onViewDetails={handleViewDetails}
						onRunBackup={handleRunBackup}
						onDeleteDestination={handleDeleteDestination}
						onNewTarget={handleNewTarget}
					/>
				)}
			</div>

			{/* Section 2: Peers Backing Up to Me (Inbound) */}
			<div>
				<header className="header mt-6">
					<h2>Peers backing up to me</h2>
					<div>Devices using me as their backup destination</div>
				</header>

				{isLoading ? (
					<div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
						<div className="text-gray-500">Loading...</div>
					</div>
				) : (
					<BackupTable
						destinations={inboundPeers}
						onViewDetails={handleViewDetails}
						onRunBackup={() => {}} // Can't trigger their backup
						onDeleteDestination={handleDeleteDestination}
						onNewTarget={handleNewTarget}
					/>
				)}
			</div>

			<BackupDetailsDialog
				backupRun={selectedBackupRun}
				onClose={() => setSelectedBackupRun(null)}
			/>

			{isPairingModalOpen &&
				<WebRTCPairingDialog
					onClose={() => setIsPairingModalOpen(false)}
					onPairingComplete={() => {
						loadDestinations() // Refresh destinations after pairing
						setIsPairingModalOpen(false)
					}}
				/>
			}

			{isIntervalModalOpen &&
				<BackupIntervalDialog
					onClose={() => setIsIntervalModalOpen(false)}
					onSave={handleSaveInterval}
					currentInterval={backupInterval}
				/>
			}

			<RecoveryDialog
				isOpen={isRecoveryModalOpen}
				onClose={() => setIsRecoveryModalOpen(false)}
				onRecoveryComplete={() => {
					loadDestinations() // Refresh destinations after recovery
					setIsRecoveryModalOpen(false)
				}}
			/>
		</>
	)
}