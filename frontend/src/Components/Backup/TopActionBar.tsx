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
		<div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
			<button
				onClick={onStartBackup}
				disabled={isBackupRunning}
				className="btn btn-primary flex items-center gap-2"
			>
				<FontAwesomeIcon icon={faPlay} />
				<span>Start Backup</span>
			</button>

			<button
				onClick={onStopBackup}
				disabled={!isBackupRunning}
				className="btn flex items-center gap-2"
			>
				<FontAwesomeIcon icon={faStop} />
				<span>Stop Backup</span>
			</button>

			<div className="ml-auto flex items-center gap-3">
				<button
					onClick={onRecovery}
					className="btn btn-secondary flex items-center gap-2"
					title="Disaster Recovery"
				>
					<FontAwesomeIcon icon={faRotate} />
					<span>Recovery</span>
				</button>

				<button
					onClick={onSchedule}
					className="btn flex items-center gap-2"
				>
					<FontAwesomeIcon icon={faClock} />
					<span>Schedule</span>
				</button>

				<button
					onClick={onNewTarget}
					className="btn btn-primary flex items-center gap-2"
				>
					<FontAwesomeIcon icon={faPlus} />
					<span>Add New Pair</span>
				</button>
			</div>
		</div>
	)
}
