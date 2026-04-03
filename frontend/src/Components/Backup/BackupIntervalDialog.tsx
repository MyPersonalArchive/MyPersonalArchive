import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClock } from "@fortawesome/free-solid-svg-icons"
import { Dialog } from "../Dialog"

type BackupIntervalDialogProps = {
	onClose: () => void
	onSave: (intervalMinutes: number) => Promise<void>
	currentInterval?: number // in minutes
}
export const BackupIntervalDialog = ({ onClose, onSave, currentInterval = 1440 }: BackupIntervalDialogProps) => {
	const [intervalMinutes, setIntervalMinutes] = useState(currentInterval)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSave = async () => {
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

	return (
		<Dialog onClose={() => onClose()} closeOnEscape={true}>
			<div className="dialog-header">
				Set backup interval
			</div>

			<div className="dialog-content">
				{error && (
					<div className="error-message">
						{error}
					</div>
				)}

				<div className="info-box">
					<h3>
						<FontAwesomeIcon icon={faClock} className="mr-2" />
						Automatic backup schedule
					</h3>
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

				<div className="flex gap-2 justify-end mt-6">
					<button 
						className="btn btn-primary"
						onClick={() => handleSave()}
						disabled={isLoading}
					>
						{isLoading ? (
							<>
								<span className="spinner"></span>
									Saving...
							</>
						) : (
							"Close"
						)}
					</button>
				</div>
			</div>
		</Dialog>
	)
}
