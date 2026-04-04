import React, { useEffect, useState } from "react"
import { BackupLog, BackupLogsResponse, BackupRunInfo, useBackupService } from "../../Utils/BackupService"
import "./BackupLogs.css"
import { useSignalR } from "../../Utils/Hooks/useSignalR"
import { formatDateTime, formatSize } from "../../Utils/formatUtils"
type BackupLogsProps  = {
	className?: string
}

export const BackupLogs: React.FC<BackupLogsProps> = ({ className = "" }) => {
	const [logs, setLogs] = useState<BackupLog[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [page, setPage] = useState(1)
	const [pageSize] = useState(20)
	const [totalPages, setTotalPages] = useState(0)
	const [statusFilter, setStatusFilter] = useState<string>("")
	const [selectedTimestamp, setSelectedTimestamp] = useState<string>("")
	const [availableLogs, setAvailableLogs] = useState<BackupRunInfo[]>([])
	
	const backupService = useBackupService()

	useSignalR(message => {
		switch (message.messageType) {
			case "BackupProgress": {
				console.log("*** Backup message: ", message)
				setLogs(prevLogs => [...prevLogs, message.data.log])
				break
			}
		}
	})

	const fetchAvailableLogs = async () => {
		try {
			const runs = await backupService.getAvailableBackupLogs()
			setAvailableLogs(runs)
			// Default to the latest run (first in the list)
			if (runs.length > 0 && !selectedTimestamp) {
				setSelectedTimestamp(runs[0].timestamp)
			}
		} catch (err) {
			console.error("Failed to fetch available backup runs:", err)
		}
	}

	const fetchLogs = async (currentPage: number = page, status?: string, timestamp?: string) => {
		try {
			setLoading(true)
			setError(null)
			const response: BackupLogsResponse = await backupService.getBackupLogs(currentPage, pageSize, status, timestamp)
			setLogs(response.logs)
			setTotalPages(response.totalPages)
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load backup logs")
			setLogs([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchAvailableLogs()
	}, [])

	useEffect(() => {
		if (selectedTimestamp) {
			fetchLogs(1, statusFilter, selectedTimestamp)
			setPage(1)
		}
	}, [statusFilter, selectedTimestamp])

	useEffect(() => {
		if (selectedTimestamp) {
			fetchLogs(page, statusFilter, selectedTimestamp)
		}
	}, [page])


	const getDuration = (start: string, end?: string): string => {
		if (!end) return "In progress..."
		const startTime = new Date(start).getTime()
		const endTime = new Date(end).getTime()
		const durationMs = endTime - startTime
		const seconds = Math.floor(durationMs / 1000)
		return `${seconds}s`
	}

	const getStatusText = (status: number): string => {
		switch (status) {
			case 1:
				return "In Progress"
			case 2:
				return "Success"
			case 3:
				return "Failed"
			default:
				return "Unknown"
		}
	}

	const getStatusClass = (status: number): string => {
		switch (status) {
			case 1:
				return "backup-log-status-inprogress"
			case 2:
				return "backup-log-status-success"
			case 3:
				return "backup-log-status-failed"
			default:
				return "backup-log-status-default"
		}
	}

	if (loading && logs.length === 0) {
		return <div className={`backup-logs ${className}`}>Loading backup logs...</div>
	}

	if (error) {
		return (
			<div className={`backup-logs ${className}`}>
				<div className="backup-logs-error">
					<p>Error loading backup logs: {error}</p>
					<button onClick={() => fetchLogs()} className="btn btn-sm">Retry</button>
				</div>
			</div>
		)
	}

	return (
		<div className={`backup-logs ${className}`}>
			<div className="backup-logs-header">
				<h3>Backup Log</h3>
				<div className="backup-logs-controls">
					<select 
						value={selectedTimestamp} 
						onChange={(e) => setSelectedTimestamp(e.target.value)}
						className="backup-logs-filter"
						disabled={loading || availableLogs.length === 0}
					>
						{availableLogs.length === 0 ? (
							<option value="">No backup runs available</option>
						) : (
							availableLogs.map((run) => (
								<option key={run.timestamp} value={run.timestamp}>
									{new Date(run.runDate).toLocaleString()} ({run.successfulItems}/{run.totalItems} successful)
								</option>
							))
						)}
					</select>
					<select 
						value={statusFilter} 
						onChange={(e) => setStatusFilter(e.target.value)}
						className="backup-logs-filter"
					>
						<option value="">All Status</option>
						<option value="Success">Success</option>
						<option value="Failed">Failed</option>
						<option value="InProgress">In Progress</option>
					</select>
					<button onClick={() => fetchLogs()} className="btn btn-sm" disabled={loading}>
						{loading ? "Refreshing..." : "Refresh"}
					</button>
				</div>
			</div>

			{logs.length === 0 ? (
				<div className="backup-logs-empty">
					<p>No backup logs found.</p>
				</div>
			) : (
				<>
					<div className="backup-logs-table-container">
						<table className="backup-logs-table">
							<thead>
								<tr>
									<th>Item</th>
									<th>Started</th>
									<th>Duration</th>
									<th>Status</th>
									<th>Size</th>
									<th>Target System</th>
									<th>Error</th>
								</tr>
							</thead>
							<tbody>
								{logs.map((log) => (
									<tr key={log.id}>
										<td>
											<div className="backup-log-item">
												<div className="backup-log-item-name">{log.itemName}</div>
												<div className="backup-log-item-type">{log.itemType} #{log.itemId}</div>
											</div>
										</td>
										<td className="backup-log-datetime">
											{formatDateTime(new Date(log.startedAt))}
										</td>
										<td className="backup-log-duration">
											{getDuration(log.startedAt, log.completedAt)}
										</td>
										<td>
											<span className={`backup-log-status ${getStatusClass(log.status)}`}>
												{getStatusText(log.status)}
											</span>
										</td>
										<td className="backup-log-size">
											{formatSize(log.fileSizeBytes) ?? "N/A"}
										</td>
										<td>
											<div className="backup-log-item">
												<div>{log.targetType}</div>
												<div className="backup-log-item-type">{log.targetSystem}</div>
											</div>
										</td>
										
										<td className="backup-log-error">
											{log.errorMessage && (
												<span className="backup-log-error-message" title={log.errorMessage}>
													{log.errorMessage.length > 50 
														? `${log.errorMessage.substring(0, 50)}...` 
														: log.errorMessage}
												</span>
											)}	
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="backup-logs-pagination">
							<button 
								onClick={() => setPage(page - 1)} 
								disabled={page <= 1}
								className="btn btn-sm"
							>
								Previous
							</button>
							<span className="backup-logs-page-info">
								Page {page} of {totalPages}
							</span>
							<button 
								onClick={() => setPage(page + 1)} 
								disabled={page >= totalPages}
								className="btn btn-sm"
							>
								Next
							</button>
						</div>
					)}
				</>
			)}
		</div>
	)
}