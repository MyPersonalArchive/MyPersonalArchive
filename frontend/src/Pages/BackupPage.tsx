import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { BackupView } from "../Components/Backup/BackupView"
import { faClock, faPlay, faPlus, faRotate, faStop } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"


export const BackupPage = () => {
	return (
		<>
			<h1 className="heading-1">
				Backup and external sync
			</h1>

			<BackupActionButtons/>

			<div className="h-8"></div>
			<OutgoingBackupTargets />
			<div className="h-12"></div>

			<IncomingBackupTargets />

			<div className="h-40"></div>
			<hr />
			Below the fold - do not keep
			<div className="h-20"></div>
			
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
						<span>Start Backup</span>
					</button>
					:
					<button
						className="btn btn-warning flex items-center gap-2"
						disabled={!backupIsRunning}
						onClick={() => setBackupIsRunning(false)}
					>
						<FontAwesomeIcon icon={faStop} />
						<span>Stop Backup</span>
					</button>
			}
			
			<div className="flex-1"></div>
			<button
				className="btn btn-secondary flex items-center gap-2"
				title="Disaster Recovery"
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
				<span>Add New Pair</span>
			</button>
			
		</div>
	)
}


const OutgoingBackupTargets = () => {
	return (
		<>
			<h2 className="heading-2">
				My backup destinations
			</h2>
			<div className="pb-4">Destinations where I send my backups</div>

			<table className="w-full table">
				<thead>
					<tr>
						<th>Status</th>
						<th>Destination</th>
						<th>Type</th>
						<th>Last Backup</th>
						<th>Next Backup</th>
						<th>Size</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>-</td>
						<td>Stian</td>
						<td>P2P</td>
						<td>-</td>
						<td>2024-06-01 12:00:00</td>
						<td>42 items / 12.2 MB</td>
						<td><button className="btn btn-secondary">View Logs</button></td>
					</tr>
				</tbody>
			</table>
		</>
	)
}

const IncomingBackupTargets = () => {
	return (
		<>
			<h2 className="heading-2">
				Peers backing up to me
			</h2>
			<div className="pb-4">Devices using me as their backup destination</div>

			<table className="w-full table">
				<thead>
					<tr>
						<th>Status</th>
						<th>Destination</th>
						<th>Type</th>
						<th>Last Backup</th>
						<th>Next Backup</th>
						<th>Size</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td colSpan={7}>
							<div className="h-24 flex flex-col justify-center items-center">
								<h3 className="heading-3">
								No backup destinations configured
								</h3>
								<p>
								Click <button className="btn btn-primary">New Backup Target</button> to get started
								</p>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</>
	)
}