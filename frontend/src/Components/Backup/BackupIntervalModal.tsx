import React, { useState, useEffect } from "react"
import "./WebRTCPairingModal.css"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClock } from "@fortawesome/free-solid-svg-icons"

interface BackupIntervalModalProps {
	isOpen: boolean
	onClose: () => void
	onSave: (intervalMinutes: number) => Promise<void>
	currentInterval?: number // in minutes
}

export const BackupIntervalModal: React.FC<BackupIntervalModalProps> = ({ 
	isOpen, 
	onClose, 
	onSave,
	currentInterval = 1440 // default 24 hours
}) => {
	const [intervalMinutes, setIntervalMinutes] = useState(currentInterval)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (isOpen) {
			setIntervalMinutes(currentInterval)
			setError(null)
		}
	}, [isOpen, currentInterval])

	const handleSave = async () => {
		if (intervalMinutes < 1) {
			setError("Interval must be at least 1 minute")
			return
		}

		setIsLoading(true)
		setError(null)
		
		try {
			await onSave(intervalMinutes)
			onClose()
		} catch (err) {
			console.error("Error saving interval:", err)
			setError("Failed to save backup interval")
		} finally {
			setIsLoading(false)
		}
	}

	const presetIntervals = [
		{ label: "15 minutes", value: 15 },
		{ label: "30 minutes", value: 30 },
		{ label: "1 hour", value: 60 },
		{ label: "6 hours", value: 360 },
		{ label: "12 hours", value: 720 },
		{ label: "24 hours", value: 1440 },
		{ label: "7 days", value: 10080 }
	]

	const getIntervalDisplay = (minutes: number): string => {
		if (minutes < 60) {
			return `${minutes} minute${minutes !== 1 ? "s" : ""}`
		} else if (minutes < 1440) {
			const hours = Math.floor(minutes / 60)
			const remainingMinutes = minutes % 60
			return remainingMinutes > 0 
				? `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`
				: `${hours} hour${hours !== 1 ? "s" : ""}`
		} else {
			const days = Math.floor(minutes / 1440)
			const remainingHours = Math.floor((minutes % 1440) / 60)
			return remainingHours > 0
				? `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`
				: `${days} day${days !== 1 ? "s" : ""}`
		}
	}

	if (!isOpen) return null

	return (
		<div className="pairing-modal-overlay" onClick={onClose}>
			<div className="pairing-modal" style={{ maxWidth: "500px" }} onClick={(e) => e.stopPropagation()}>
				<div className="pairing-modal-header">
					<h2>Set Backup Interval</h2>
					<button 
						className="pairing-modal-close" 
						onClick={onClose}
						disabled={isLoading}
					>
						×
					</button>
				</div>

				<div className="pairing-modal-body">
					{error && (
						<div className="error-message">
							{error}
						</div>
					)}

					<div className="pairing-info-box">
						<h3><FontAwesomeIcon icon={faClock} /> Automatic Backup Schedule</h3>
						<p>
							Set how often your backup should run automatically. 
							The backup will continue running at this interval until stopped.
						</p>
					</div>

					<div className="form-group">
						<label>Quick Presets</label>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px", marginBottom: "16px" }}>
							{presetIntervals.map(preset => (
								<button
									key={preset.value}
									type="button"
									className={`btn ${intervalMinutes === preset.value ? "btn-primary" : "btn-secondary"}`}
									onClick={() => setIntervalMinutes(preset.value)}
									disabled={isLoading}
								>
									{preset.label}
								</button>
							))}
						</div>
					</div>

					<div className="form-group">
						<label>Custom Interval (minutes)</label>
						<input
							type="number"
							value={intervalMinutes}
							onChange={(e) => setIntervalMinutes(Math.max(1, parseInt(e.target.value) || 1))}
							min="1"
							disabled={isLoading}
							style={{ width: "100%" }}
						/>
						<div className="input-hint">
							Current interval: {getIntervalDisplay(intervalMinutes)}
						</div>
					</div>

					<div className="pairing-actions" style={{ marginTop: "24px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
						<button 
							className="btn btn-secondary"
							onClick={onClose}
							disabled={isLoading}
						>
							Cancel
						</button>
						<button 
							className="btn btn-primary"
							onClick={handleSave}
							disabled={isLoading}
						>
							{isLoading ? (
								<>
									<span className="spinner"></span>
									Saving...
								</>
							) : (
								"Save Interval"
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
