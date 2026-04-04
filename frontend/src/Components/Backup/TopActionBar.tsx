import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlay, faStop, faClock, faPlus, faRotate } from "@fortawesome/free-solid-svg-icons"

type TopActionBarProps = {
	onStartBackup: () => void
	onStopBackup: () => void
	onSchedule: () => void
	onNewTarget: () => void
	onRecovery: () => void
	isBackupRunning: boolean
}
export const TopActionBar = ({
	onStartBackup,
	onStopBackup,
	onSchedule,
	onNewTarget,
	onRecovery,
	isBackupRunning
}: TopActionBarProps) => {
	return (
		<div className="flex gap-2">
			{!isBackupRunning &&
				<button className="btn btn-primary"
					onClick={onStartBackup}
				>
					<FontAwesomeIcon icon={faPlay} className="mr-2" />
					<span>Start Backup</span>
				</button>
			}
			
			{isBackupRunning &&
				<button className="btn btn-warning"
					onClick={onStopBackup}
				>
					<FontAwesomeIcon icon={faStop} className="mr-2" />
					<span>Stop Backup</span>
				</button>
			}

			<div className="flex-1"></div>

			<button className="btn btn-secondary"
				onClick={onRecovery}
				title="Disaster recovery"
			>
				<FontAwesomeIcon icon={faRotate} className="mr-2"/>
				<span>Recovery</span>
			</button>

			<button className="btn"
				onClick={onSchedule}
			>
				<FontAwesomeIcon icon={faClock} className="mr-2"/>
				<span>Schedule</span>
			</button>

			<button className="btn btn-primary"
				onClick={onNewTarget}
			>
				<FontAwesomeIcon icon={faPlus} className="mr-2"/>
				<span>Add new pair</span>
			</button>
		</div>
	)
}
