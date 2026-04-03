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
import { formatSize } from "../../Utils/formatUtils"

interface BackupTableProps {
	destinations: BackupDestination[]
	onViewDetails: (destinationId: number) => void
	onRunBackup: (destinationId: number) => void
	onDeleteDestination: (destinationId: number) => void
}

function StatusIcon({ status }: { status: BackupStatus }) {
	switch (status) {
		case BackupStatus.Success:
			return <FontAwesomeIcon icon={faCheckCircle} className="text-green-600" />
		case BackupStatus.Failed:
			return <FontAwesomeIcon icon={faExclamationCircle} className="text-red-600" />
		case BackupStatus.Running:
			return <FontAwesomeIcon icon={faSpinner} className="text-blue-600 animate-spin" />
		case BackupStatus.Pending:
		case BackupStatus.Scheduled:
			return <FontAwesomeIcon icon={faClock} className="text-gray-500" />
		case BackupStatus.Paused:
			return <FontAwesomeIcon icon={faPause} className="text-yellow-600" />
		default:
			return null
	}
}

function formatDate(date: Date | null): string {
	if (!date) return "Never"
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	}).format(date)
}

function ActionMenu({
	destinationId,
	onRunBackup,
	onDeleteDestination
}: {
	destinationId: number
	onRunBackup: (id: number) => void
	onDeleteDestination: (id: number) => void
}) {
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

export function BackupTable({
	destinations,
	onViewDetails,
	onRunBackup,
	onDeleteDestination
}: BackupTableProps) {
	return (
		<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<div className="overflow-x-auto">
				<table className="w-full min-w-max">
					<thead className="bg-gray-50 border-b border-gray-200">
						<tr>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								Status
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[200px]">
								Destination
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								Type
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								Last Backup
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
								Next Backup
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
								Items
							</th>
							<th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
								Size
							</th>
							<th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider sticky right-0 bg-gray-50">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{destinations.map((destination) => (
							<tr
								key={destination.id}
								className="hover:bg-gray-50 cursor-pointer transition"
								onClick={() => onViewDetails(destination.id)}
							>
								<td className="px-4 py-4 whitespace-nowrap">
									<div className="flex items-center gap-2">
										<StatusIcon status={destination.status} />
										<span className="text-sm font-medium text-gray-900 hidden sm:inline">
											{destination.status}
										</span>
									</div>
								</td>
								<td className="px-4 py-4">
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
								<td className="px-4 py-4 whitespace-nowrap">
									<span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
										{destination.type}
									</span>
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
									{formatDate(destination.lastBackup)}
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 hidden lg:table-cell">
									{formatDate(destination.nextBackup)}
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
									{destination.itemsBackedUp.toLocaleString()}
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 hidden md:table-cell">
									{formatSize(destination.totalSize)}
								</td>
								<td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium sticky right-0 bg-white">
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
				</table>
			</div>

			{destinations.length === 0 && (
				<div className="py-12 text-gray-500 flex flex-col items-center" onClick={() => newBackupTarget()}>
					<p className="text-lg">No backup destinations configured</p>
					<p className="text-sm">Click "Add new pair" to get started</p>
				</div>
			)}
		</div>
	)
}
