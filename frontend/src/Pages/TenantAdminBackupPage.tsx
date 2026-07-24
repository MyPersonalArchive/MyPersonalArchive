import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { BackupView } from "../Components/Backup/BackupView"
import { faClock, faPlay, faPlus, faRotate, faStop } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"


export const TenantAdminBackupPage = () => {
	return (
		<div className="form">
			<header className="header">
				<h1>Backup and external sync</h1>
				<div className="todo mt-2">
					//TODO: Implement this, since this is a placeholder/sample page
				</div>
			</header>
			
			{/* <BackupActionButtons /> */}
			<BackupView />

			<div className="todo mt-2">
				<div>Backup and external sync should allow:</div>
				- See current backup status<br />
				<div className="pl-4">- Schedule backups</div>
				<div className="pl-4">- Manually start and stop backups?</div>
				<div className="pl-4">- Recovery options</div>
				<div className="pl-4">- View backup history (Navigate to Logs page?)</div>
				- External sync options<br />
				<div className="pl-4">- Configure external sync destinations</div>
				<div className="pl-4">- Manage backup destinations</div>
			</div>
		</div>
	)
}


const BackupActionButtons = () => {
	const [backupIsRunning, setBackupIsRunning] = useState<boolean>(false)

	return (
		<div className="stack-horizontal my-4">

			{
				!backupIsRunning ?
					<button
						className="btn btn-primary flex items-center gap-2"
						onClick={() => setBackupIsRunning(true)}
					>
						<FontAwesomeIcon icon={faPlay} />
						<span>Start backup</span>
					</button>
					:
					<button
						className="btn btn-warning flex items-center gap-2"
						disabled={!backupIsRunning}
						onClick={() => setBackupIsRunning(false)}
					>
						<FontAwesomeIcon icon={faStop} />
						<span>Stop backup</span>
					</button>
			}
			
			<div className="flex-1"></div>
			<button
				className="btn btn-secondary flex items-center gap-2"
				title="Disaster recovery"
			>
				<FontAwesomeIcon icon={faRotate} />
				<span>Recovery</span>
			</button>

			<button
				className="btn flex items-center gap-2"
			>
				<FontAwesomeIcon icon={faClock} />
				<span>Schedule</span>
			</button>

			<button
				className="btn btn-primary flex items-center gap-2"
			>
				<FontAwesomeIcon icon={faPlus} />
				<span>Add new pair</span>
			</button>
			
		</div>
	)
}

