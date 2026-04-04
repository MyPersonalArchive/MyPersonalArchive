import React, { useState, useEffect } from "react"
import { useBackupService, BackupStatus } from "../../Utils/BackupService"
import "./BackupManager.css"
import { useSignalR } from "../../Utils/useSignalR"
import { BackupLogs } from "./BackupLogs"
import { WebRTCPairing } from "./WebRTCPairing"

//TODO: Add delete remote backups functionality

const BackupManager = () => {
	const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null)
	const [password, setPassword] = useState("")
	const [target, setTarget] = useState("http://localhost:5555")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [backupProvider, setBackupProvider] = useState("WebRTC")
	const [encryptionProvider, setEncryptionProvider] = useState("None")
	const [backupProgress, setBackupProgress] = useState<{ current: number; total: number } | null>(null)
	
	const backupService = useBackupService()

	useSignalR(message => {
		switch (message.messageType) {
			// case "BackupProgress": {
			// 	console.log("*** Backup message: ", message)
			// 	setBackupProgress(message.data)
			// 	break
			// }
			case "BackupCompleted": {
				console.log("*** Backup completed message: ", message)
				setBackupProgress(null)
				backupService.getBackupStatus().then(status => setBackupStatus(status))
				break
			}
		}
	})

	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const status = await backupService.getBackupStatus()
				setBackupStatus(status)
			} catch {
				setError("Failed to fetch backup status")
			}
		}

		fetchStatus()
	}, [])

	const handleStartBackup = async () => {
		if ( encryptionProvider !== "None" && !password) {
			setError("Password is required")
			return
		}

		setIsLoading(true)
		setError(null)
		
		try {
			await backupService.startBackup(target, password, backupProvider, encryptionProvider)
			setPassword("") // Clear password after successful start
			setBackupStatus({ status: 1 }) // Set status to running
		} catch {
			setError("Failed to start backup")
		} finally {
			setIsLoading(false)
		}
	}

	const handleStopBackup = async () => {
		setIsLoading(true)
		try {
			await backupService.stopBackup()
			setBackupStatus({ status: 0 }) 
		} catch {
			setError("Error stopping backup")
		} finally {
			setIsLoading(false)
		}
	}

	const getStatusDisplayClass = (status?: number) => {
		switch (status) {
			case 0: return "status-notstarted"
			case 1: return "status-running"
			case 2: return "status-waiting"
			default: return "Unknown"
		}
	}

	return (
		<div className="backup-manager">
			{/* Status Display */}
			<div className="backup-section">
				<header className="header">
					<h3>Current Status</h3>
				</header>
				{backupStatus ? (
					<div className="status-info">
						<p>
							Status: <span className={getStatusDisplayClass(backupStatus.status)}>
								{getStatusDisplayClass(backupStatus.status)}
							</span>
						</p>
						{backupStatus.lastBackupTime && (
							<p>Last Backup: {new Date(backupStatus.lastBackupTime).toLocaleString()}</p>
						)}
						{backupStatus.nextBackupTime && (
							<p>Next Backup: {new Date(backupStatus.nextBackupTime).toLocaleString()}</p>
						)}
						{backupProgress && (
							<p>Message: {`Backed up ${backupProgress.current} of ${backupProgress.total} items`}</p>
						)}
					</div>
				) : (
					<p>Loading status...</p>
				)}
			</div>

			{/* Configuration */}
			<div className="backup-section">
				<header className="header">
					<h3>Configuration</h3>
				</header>
				<div className="config-options">
					<div className="config-row">
						<label htmlFor="backup-provider">Backup Provider:</label>
						<select 
							id="backup-provider"
							value={backupProvider} 
							onChange={(e) => setBackupProvider(e.target.value)}
							disabled={backupStatus?.status === 1}
						>
							<option value="WebRTC">WebRTC P2P</option>
							{/* <option value="BuddyTarget">Buddy Target</option> */}
						</select>
					</div>

					<div className="config-row">
						<label htmlFor="encryption-provider">Encryption:</label>
						<select 
							id="encryption-provider"
							value={encryptionProvider} 
							onChange={(e) => setEncryptionProvider(e.target.value)}
							disabled={backupStatus?.status === 1}
						>
							<option value="None">None</option>
							<option value="AesOpenssl">AES OpenSSL</option>
						</select>
					</div>

					{backupProvider === "BuddyTarget" && (
						<div className="config-row">
							<label htmlFor="backup-target">Target Address:</label>
							<input
								type="text"
								id="backup-target"
								placeholder="http://localhost:5555"
								value={target}
								onChange={(e) => setTarget(e.target.value)}
								disabled={backupStatus?.status === 1}
								className="target-input"
							/>
						</div>
					)}

					{backupProvider === "WebRTC" && (
						<WebRTCPairing 
							onPairingCodeChange={(code) => setTarget(code)}
							disabled={backupStatus?.status === 1}
						/>
					)}
				</div>
			</div>

			{/* Controls */}
			<div className="backup-section">
				<header className="header">
					<h3>Controls</h3>
				</header>

				{backupStatus?.status === null || backupStatus?.status === 0 ? (
					<div className="start-backup">
						{encryptionProvider !== "None" && (
							<input
								type="password"
								placeholder="Backup password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={isLoading}
								className="password-input"
							/>
						)}
						<button 
							onClick={handleStartBackup} 
							disabled={isLoading || (encryptionProvider !== "None" && !password) || !target}
							className="start-button"
						>
							{isLoading ? "Starting..." : "Start backup"}
						</button>
					</div>
				) : (
					<button 
						onClick={handleStopBackup} 
						disabled={isLoading}
						className="stop-button"
					>
						{isLoading ? "Stopping..." : "Stop backup"}
					</button>
				)}
			</div>

			{error && <div className="error-message">{error}</div>}
			
			<BackupLogs />
		</div>
	)
}

export default BackupManager