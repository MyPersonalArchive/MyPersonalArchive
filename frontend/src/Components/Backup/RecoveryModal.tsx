import React, { useState, useEffect } from "react"
import "./WebRTCPairingModal.css"
import { usePairingService } from "../../Utils/PairingService"
import { useBackupService } from "../../Utils/BackupService"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faRotate, faClipboard, faCheckCircle, faUpload, faDownload, faClock } from "@fortawesome/free-solid-svg-icons"

interface RecoveryModalProps {
	isOpen: boolean
	onClose: () => void
	onRecoveryComplete: () => void
}

export const RecoveryModal: React.FC<RecoveryModalProps> = ({ 
	isOpen, 
	onClose, 
	onRecoveryComplete 
}) => {
	const [mode, setMode] = useState<"generate" | "use" | null>(null)
	const [recoveryCode, setRecoveryCode] = useState("")
	const [inputCode, setInputCode] = useState("")
	const [password, setPassword] = useState("")
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [availableBackups, setAvailableBackups] = useState(0)
	const [isRecovering, setIsRecovering] = useState(false)
	
	const pairingService = usePairingService()
	const backupService = useBackupService()

	// Reset state when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			resetState()
		}
	}, [isOpen])

	const resetState = () => {
		setMode(null)
		setRecoveryCode("")
		setInputCode("")
		setPassword("")
		setIsLoading(false)
		setError(null)
		setAvailableBackups(0)
		setIsRecovering(false)
	}

	const handleGenerateCode = async () => {
		setIsLoading(true)
		setError(null)
		
		try {
			const response = await pairingService.generateRecoveryCode()
			
			if (!response || !response.code) {
				throw new Error("Invalid response from recovery service")
			}
			
			setRecoveryCode(response.code)
			setAvailableBackups(response.availableBackupCount)
			setMode("generate")
		} catch (error: any) {
			console.error("Generate recovery code error:", error)
			setError(error.response?.data || "Failed to generate recovery code. Make sure you have backups available.")
		} finally {
			setIsLoading(false)
		}
	}

	const handleUseRecoveryCode = async () => {
		if (!inputCode || inputCode.length !== 6) {
			setError("Please enter a valid 6-digit code")
			return
		}

		if (!password) {
			setError("Please enter the encryption password")
			return
		}

		setIsLoading(true)
		setError(null)
		
		try {
			// Step 1: Use the recovery code to establish connection
			console.log("Using recovery code:", inputCode)
			const pairingResult = await pairingService.useRecoveryCode(inputCode)
			
			if (!pairingResult || !pairingResult.success || !pairingResult.target) {
				throw new Error("Failed to use recovery code")
			}

			console.log("Recovery code accepted, starting restore with target:", pairingResult.target)
			setIsRecovering(true)

			// Step 2: Start the restore process
			// Use the WebRTC target from the pairing result
			await backupService.startRestore(password, pairingResult.target)
			
			// Close modal after brief delay
			setTimeout(() => {
				onRecoveryComplete()
				onClose()
			}, 1500)
		} catch (error: any) {
			console.error("Recovery error:", error)
			setError(error.response?.data || "Failed to recover data. Check the code and password.")
			setIsRecovering(false)
		} finally {
			setIsLoading(false)
		}
	}

	const handleCancel = () => {
		onClose()
	}

	if (!isOpen) return null

	return (
		<div className="pairing-modal-overlay" onClick={handleCancel}>
			<div className="pairing-modal" onClick={(e) => e.stopPropagation()}>
				<div className="pairing-modal-header">
					<h2><FontAwesomeIcon icon={faRotate} /> Disaster Recovery</h2>
					<button 
						className="pairing-modal-close" 
						onClick={handleCancel}
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

					{!mode && (
						<>
							<div className="pairing-info-box">
								<h3><FontAwesomeIcon icon={faClipboard} /> Choose Recovery Option</h3>
								<p>
									<strong>Generate Code:</strong> Create a recovery code to allow another device to restore your backups.<br/>
									<strong>Use Code:</strong> Enter a recovery code from another device to restore your lost data.
								</p>
							</div>

							<div className="pairing-mode-selector">
								<button 
									className="btn btn-primary"
									onClick={handleGenerateCode}
									disabled={isLoading}
									style={{ marginBottom: "12px", width: "100%" }}
								>
									{isLoading ? (
										<>
											<span className="spinner"></span>
											Generating...
										</>
									) : (
										<><FontAwesomeIcon icon={faUpload} /> Generate Recovery Code</>
									)}
								</button>

								<button 
									className="btn btn-secondary"
									onClick={() => setMode("use")}
									disabled={isLoading}
									style={{ width: "100%" }}
								>
									<FontAwesomeIcon icon={faDownload} /> Use Recovery Code
								</button>
							</div>
						</>
					)}

					{mode === "generate" && (
						<>
							<div className="pairing-success">
								<h3><FontAwesomeIcon icon={faCheckCircle} /> Recovery Code Generated</h3>
								<div className="pairing-code-display">
									{recoveryCode}
								</div>
								<p className="pairing-code-hint">
									Share this code with the device that needs to recover data.
									<br />
									Available backups: <strong>{availableBackups}</strong>
									<br />
									<span className="text-warning"><FontAwesomeIcon icon={faClock} /> Expires in 24 hours</span>
								</p>
							</div>

							<div className="pairing-actions">
								<button 
									className="btn btn-primary"
									onClick={handleCancel}
								>
									Done
								</button>
							</div>
						</>
					)}

					{mode === "use" && !isRecovering && (
						<>
							<div className="form-group">
								<label>Recovery Code</label>
								<input
									type="text"
									value={inputCode}
									onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
									placeholder="Enter 6-digit code"
									maxLength={6}
									autoFocus
									disabled={isLoading}
								/>
								<div className="input-hint">
									Enter the recovery code provided by the backup holder
								</div>
							</div>

							<div className="form-group">
								<label>Encryption Password</label>
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="Enter backup encryption password"
									disabled={isLoading}
								/>
								<div className="input-hint">
									The password used when the backups were created
								</div>
							</div>

							<div className="pairing-actions">
								<button 
									className="btn btn-secondary"
									onClick={() => setMode(null)}
									disabled={isLoading}
								>
									Back
								</button>
								<button 
									className="btn btn-primary"
									onClick={handleUseRecoveryCode}
									disabled={isLoading || !inputCode || !password}
								>
									{isLoading ? (
										<>
											<span className="spinner"></span>
											Connecting...
										</>
									) : (
										"Start Recovery"
									)}
								</button>
							</div>
						</>
					)}

					{isRecovering && (
						<div className="pairing-success">
							<h3><FontAwesomeIcon icon={faRotate} spin /> Recovery in Progress</h3>
							<p>
								Restoring your data from the backup...
								<br />
								This may take several minutes depending on the size of your backup.
							</p>
							<div className="spinner-large"></div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
