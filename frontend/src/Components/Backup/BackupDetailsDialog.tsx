import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
	faCheckCircle,
	faExclamationCircle,
	faSpinner,
	faClock,
	faTimes
} from "@fortawesome/free-solid-svg-icons"
import { BackupRun, BackupStatus } from "../../types/backup"
import { formatDateTime, formatDuration, formatSize } from "../../Utils/formatUtils"


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
		default:
			return null
	}
}


function ProgressBar({ current, total }: { current: number; total: number }) {
	const percentage = total > 0 ? (current / total) * 100 : 0
	
	return (
		<div className="w-full bg-gray-200 rounded-full h-2">
			<div
				className="bg-blue-600 h-2 rounded-full transition-all duration-300"
				style={{ width: `${percentage}%` }}
			/>
		</div>
	)
}

type BackupDetailsDialogProps = {
	backupRun: BackupRun | null
	onClose: () => void
}
export function BackupDetailsDialog({ backupRun, onClose }: BackupDetailsDialogProps) {
	if (!backupRun) return null

	const isRunning = backupRun.status === BackupStatus.Running
	const duration = backupRun.completedAt
		? (backupRun.completedAt.getTime() - backupRun.startedAt.getTime()) / 1000
		: undefined

	return (
		<>
			{/* Backdrop with blur */}
			<div
				className="pairing-modal-overlay"
				onClick={onClose}
			>
				{/* Modal */}
				<div className="pairing-modal" style={{ maxWidth: "80rem" }} onClick={(e) => e.stopPropagation()}>
					<div className="bg-white rounded-lg shadow-xl w-full max-h-[90vh] flex flex-col">
						{/* Header */}
						<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
							<div>
								<header className="header">
									<h2>Backup Details: {backupRun.destinationName}</h2>
								</header>
								
								<p className="text-sm text-gray-600 mt-1">
								Started: {formatDateTime(backupRun.startedAt)}
									{backupRun.completedAt && ` • Completed: ${formatDateTime(backupRun.completedAt)}`}
								</p>
							</div>

							<button
								onClick={onClose}
								className="p-2 hover:bg-gray-100 rounded transition"
							>
								<FontAwesomeIcon icon={faTimes} className="text-gray-600" />
							</button>
						</div>

						{/* Summary Stats */}
						<div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
							<div className="grid grid-cols-4 gap-4">
								<div>
									<div className="text-xs text-gray-600 uppercase mb-1">Status</div>
									<div className="flex items-center gap-2">
										<StatusIcon status={backupRun.status} />
										<span className="font-semibold text-gray-900">{backupRun.status}</span>
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-600 uppercase mb-1">Duration</div>
									<div className="font-semibold text-gray-900">
										{isRunning ? "In Progress" : formatDuration(duration)}
									</div>
								</div>
								<div>
									<div className="text-xs text-gray-600 uppercase mb-1">Items</div>
									<div className="font-semibold text-gray-900">
										{backupRun.itemsCompleted} / {backupRun.itemsTotal}
									</div>
									<ProgressBar current={backupRun.itemsCompleted} total={backupRun.itemsTotal} />
								</div>
								<div>
									<div className="text-xs text-gray-600 uppercase mb-1">Data Transferred</div>
									<div className="font-semibold text-gray-900">
										{formatSize(backupRun.transferredSize)} / {formatSize(backupRun.totalSize)}
									</div>
									<ProgressBar current={backupRun.transferredSize} total={backupRun.totalSize} />
								</div>
							</div>

							{backupRun.error && (
								<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
									<FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
									{backupRun.error}
								</div>
							)}
						</div>

						{/* Items Table */}
						<div className="flex-1 overflow-auto px-6 py-4">
							<header className="header">
								<h3>Backup Items ({backupRun.items.length})</h3>
							</header>
							
							<table className="w-full">
								<thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
									<tr>
										<th>Status</th>
										<th>Item</th>
										<th>Type</th>
										<th>Started</th>
										<th>Duration</th>
										<th>Size</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-200">
									{backupRun.items.map((item) => (
										<tr key={item.id} className="hover:bg-gray-50">
											<td className="px-4 py-3 whitespace-nowrap">
												<div className="flex items-center gap-2">
													<StatusIcon status={item.status} />
													<span className="text-sm text-gray-900">{item.status}</span>
												</div>
											</td>
											<td>
												<div className="text-sm font-medium text-gray-900">{item.name}</div>
												{item.error && (
													<div className="text-xs text-red-600 mt-1">{item.error}</div>
												)}
											</td>
											<td className="whitespace-nowrap">
												<span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
													{item.type}
												</span>
											</td>
											<td className="whitespace-nowrap">
												{formatDateTime(item.startedAt)}
											</td>
											<td className="whitespace-nowrap">
												{formatDuration(item.duration)}
											</td>
											<td className="whitespace-nowrap">
												{formatSize(item.size)}
											</td>
										</tr>
									))}
								</tbody>
							</table>

							{backupRun.items.length === 0 && (
								<div className="text-center py-8 text-gray-500">
								No items in this backup run
								</div>
							)}
						</div>

						{/* Footer */}
						<div className="px-6 py-4 border-t border-gray-200 flex justify-end">
							<button onClick={onClose} className="btn btn-primary">
							Close
							</button>
						</div>
					</div>
				</div>
			</div>
		</>
	)
}
