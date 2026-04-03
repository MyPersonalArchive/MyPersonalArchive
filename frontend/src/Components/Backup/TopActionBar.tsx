import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlay, faStop, faClock, faPlus, faRotate } from "@fortawesome/free-solid-svg-icons"

interface TopActionBarProps {
	onStartBackup: () => void
	onStopBackup: () => void
	onSchedule: () => void
	onNewTarget: () => void
	onRecovery: () => void
	isBackupRunning: boolean
}

export function TopActionBar({
	onStartBackup,
	onStopBackup,
	onSchedule,
	onNewTarget,
	onRecovery,
	isBackupRunning
}: TopActionBarProps) {
	return (
		<div className="flex gap-2">
			<button
				onClick={onStartBackup}
				disabled={isBackupRunning}
				className="btn btn-primary"
			>
				<FontAwesomeIcon icon={faPlay} className="mr-2" />
				<span>Start Backup</span>
			</button>

			<button
				onClick={onStopBackup}
				disabled={!isBackupRunning}
				className="btn"
			>
				<FontAwesomeIcon icon={faStop} className="mr-2" />
				<span>Stop Backup</span>
			</button>

			<div className="flex-1"></div>

			<button
				onClick={onRecovery}
				className="btn btn-secondary"
				title="Disaster recovery"
			>
				<FontAwesomeIcon icon={faRotate} className="mr-2"/>
				<span>Recovery</span>
			</button>

			<button
				onClick={onSchedule}
				className="btn"
			>
				<FontAwesomeIcon icon={faClock} className="mr-2"/>
				<span>Schedule</span>
			</button>

			<button
				onClick={onNewTarget}
				className="btn btn-primary"
			>
				<FontAwesomeIcon icon={faPlus} className="mr-2"/>
				<span>Add new pair</span>
			</button>
		</div>
	)
}
