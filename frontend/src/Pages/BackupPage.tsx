import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { BackupView } from "../Components/Backup/BackupView"
import { faClock, faPlay, faPlus, faRotate, faStop } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"


export const BackupPage = () => {
	return (
		<>
			{/* <header className="header">
				<h1 className="heading-1">
					Backup and external sync
				</h1>
			</header>

			<BackupActionButtons/> */}
			
			<BackupView />
		</>
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

