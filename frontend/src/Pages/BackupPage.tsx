import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { BackupView } from "../Components/Backup/BackupView"
import { faClock, faPlay, faPlus, faRotate, faStop } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"


export const BackupPage = () => {
	const [backupIsRunning, setBackupIsRunning] = useState<boolean>(false)
	return (
		<>
			<h1 className="heading-1">
				Backup and external sync
			</h1>

			<table className="table">
				<thead>
					<tr>
						<th>Source</th>
						<th>Destination</th>
						<th>Status</th>
						<th>Last Backup</th>
						<th>Next Backup</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>/home/user/documents</td>
						<td>/mnt/backup/documents</td>
						<td><span className="badge badge-success">Success</span></td>
						<td>2024-06-01 12:00:00</td>
						<td>2024-06-02 12:00:00</td>
						<td><button className="btn btn-secondary">View Logs</button></td>
					</tr>
					<tr>
						<td>/home/user/photos</td>
						<td>/mnt/backup/photos</td>
						<td><span className="badge badge-success">Success</span></td>
						<td>2024-06-01 12:00:00</td>
						<td>2024-06-02 12:00:00</td>
						<td><button className="btn btn-secondary">View Logs</button></td>
					</tr>
				</tbody>

			</table>

			<div className="stack-horizontal to-the-right my-4">

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
				<div className="ml-auto flex items-center gap-3">
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
			</div>


			<BackupView />
		</>
	)
}