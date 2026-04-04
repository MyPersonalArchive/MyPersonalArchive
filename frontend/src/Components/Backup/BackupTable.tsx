import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
	faCheckCircle,
	faExclamationCircle,
	faSpinner,
	faClock,
	faPause,
	faEllipsisV,
	faPlay,
	faTrash,
	faCircle
} from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"
import { BackupDestination, BackupStatus } from "../../types/backup"
import { formatDate, formatDateTime, formatSize } from "../../Utils/formatUtils"


type BackupTableProps = {
	destinations: BackupDestination[]
	onViewDetails: (destinationId: number) => void
	onRunBackup: (destinationId: number) => void
	onDeleteDestination: (destinationId: number) => void
	onNewTarget: () => void
}
export const BackupTable = ({ destinations, onViewDetails, onRunBackup, onDeleteDestination, onNewTarget }: BackupTableProps) => {
	return (
		<div>
			<div >
				<table className="table w-full">
					<thead>
						<tr>
							<th>Status</th>
							<th>Destination</th>
							<th>Type</th>
							<th>Last Backup</th>
							<th># of items / Size</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{destinations.map((destination) => (
							<tr
								key={destination.id}
								className="hover:bg-gray-50 cursor-pointer transition"
								onClick={() => onViewDetails(destination.id)}
							>
								<td className="whitespace-nowrap">
									<div className="flex items-center gap-2">
										<StatusIcon status={destination.status} />
										<span className="text-sm font-medium text-gray-900 hidden sm:inline">
											{destination.status}
										</span>
									</div>
								</td>
								<td>
									<div className="flex items-center gap-2">
										<div className="text-sm font-medium text-gray-900 max-w-[200px] truncate" title={destination.name}>
											{destination.name}
										</div>
										{destination.type === "WebRTC" && (
											<FontAwesomeIcon 
												icon={faCircle} 
												className={`text-xs ${destination.isConnected ? "text-green-500" : "text-red-500"}`}
												title={destination.isConnected ? "Connected" : "Disconnected"}
											/>
										)}
									</div>
									{!destination.enabled && (
										<div className="text-xs text-gray-500">Disabled</div>
									)}
								</td>
								<td className="whitespace-nowrap">
									<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
										{destination.type}
									</span>
								</td>
								<td className="whitespace-nowrap" title={`Next backup scheduled at: ${formatDate(destination.nextBackup) ?? "N/A"}`}>
									{formatDateTime(destination.lastBackup) ?? "Never backed up"}
								</td>
								<td className="whitespace-nowrap">
									{destination.itemsBackedUp.toLocaleString()} / {formatSize(destination.totalSize)}
								</td>
								<td className="whitespace-nowrap">
									<div onClick={(e) => e.stopPropagation()}>
										<ActionMenu
											destinationId={destination.id}
											onRunBackup={onRunBackup}
											onDeleteDestination={onDeleteDestination}
										/>
									</div>
								</td>
							</tr>
						))}
					</tbody>
					<tfoot>
						{destinations.length === 0 &&
							<tr>
								<td colSpan={8}>
									<div className="py-12 flex flex-col items-center cursor-pointer"
										onClick={onNewTarget}
									>
										<p className="text-lg">No backup destinations configured</p>
										<p className="text-sm">Click "Add new pair" to get started</p>
									</div>
								</td>
							</tr>
						}
					</tfoot>
				</table>
			</div>
		</div>
	)
}



type ActionMenuProps = {
	destinationId: number
	onRunBackup: (id: number) => void
	onDeleteDestination: (id: number) => void
}
const ActionMenu = ({ destinationId, onRunBackup, onDeleteDestination}: ActionMenuProps) => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div className="relative">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="p-2 hover:bg-gray-100 rounded transition"
			>
				<FontAwesomeIcon icon={faEllipsisV} />
			</button>

			{isOpen && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setIsOpen(false)}
					/>
					<div className="fixed right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
						<button
							onClick={() => {
								onRunBackup(destinationId)
								setIsOpen(false)
							}}
							className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 transition rounded-t-lg"
						>
							<FontAwesomeIcon icon={faPlay} className="text-blue-600" />
							<span>Run Backup Now</span>
						</button>
						<button
							onClick={() => {
								onDeleteDestination(destinationId)
								setIsOpen(false)
							}}
							className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600 transition rounded-b-lg"
						>
							<FontAwesomeIcon icon={faTrash} />
							<span>Delete</span>
						</button>
					</div>
				</>
			)}
		</div>
	)
}


type StatusIconProps = {
	status: BackupStatus
}
const StatusIcon = ({ status }: StatusIconProps) => {
	switch (status) {
		case BackupStatus.Success:
			return <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
		case BackupStatus.Failed:
			return <FontAwesomeIcon icon={faExclamationCircle} className="text-red-600" />
		case BackupStatus.Running:
			return <FontAwesomeIcon icon={faSpinner} spinPulse className="text-blue-600" />
		case BackupStatus.Pending:
		case BackupStatus.Scheduled:
			return <FontAwesomeIcon icon={faClock} className="text-gray-500" />
		case BackupStatus.Paused:
			return <FontAwesomeIcon icon={faPause} className="text-yellow-600" />
		default:
			return null
	}
}
