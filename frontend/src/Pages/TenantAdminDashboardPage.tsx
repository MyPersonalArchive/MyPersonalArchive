import { useEffect, useState } from "react"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { formatSize } from "../Utils/formatUtils"
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"


type GetStatsResponse = {
	availableStorage: number
	totalUsedStorage: number
	blobStorage: number
	blobCount: number
	archiveItemStorage: number
	archiveItemCount: number
	numberOfUsers: number
}

export const TenantAdminDashboardPage = () => {
	const apiClient = useApiClient()
	const [stats, setStats] = useState<GetStatsResponse>()

	useEffect(() => {
		apiClient.query<GetStatsResponse>("GetStats")
			.then(response => {
				setStats(response)
			})
	}, [])

	const radius = 42
	const circumference = 2 * Math.PI * radius

	const storageSegments = stats && stats.availableStorage > 0
		? [
			{ label: "Blobs", bytes: stats.blobStorage, color: "#2563eb", count: stats.blobCount },
			{ label: "Archive items", bytes: stats.archiveItemStorage, color: "#16a34a", count: stats.archiveItemCount },
			{ label: "Other", bytes: Math.max(0, stats.totalUsedStorage - stats.blobStorage - stats.archiveItemStorage), color: "#d97706" }
		]
		: []

	const usedPercentage = stats && stats.availableStorage > 0
		? Math.round((stats.totalUsedStorage / stats.availableStorage) * 100)
		: 0

	const graphSamples = [24, 35, 31, 48, 44, 57, 53]
	const chartWidth = 320
	const chartHeight = 130
	const xStep = chartWidth / (graphSamples.length - 1)
	const points = graphSamples
		.map((value, index) => {
			const x = index * xStep
			const y = chartHeight - (value / 60) * chartHeight
			return `${x},${y}`
		})
		.join(" ")

	return (
		<div className="form">
			<header className="header">
				<h1>Admin Dashboard</h1>
			</header>

			<div className="flex flex-wrap gap-6">
				<div className="card min-w-[220px] flex-1 p-4">
					<h2 className="mb-3 text-sm font-semibold text-gray-600">Storage</h2>
					<div className="flex items-center justify-center">
						<svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Storage at ${usedPercentage} percent`}>
							<circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
							{(() => {
								let cumulativeFraction = 0
								return storageSegments.map(segment => {
									const fraction = segment.bytes / stats!.availableStorage
									const segmentLength = circumference * fraction
									const dashOffset = circumference * (1 - cumulativeFraction)
									cumulativeFraction += fraction
									return (
										<circle key={segment.label}
											cx="60" cy="60" r={radius}
											fill="none" stroke={segment.color} strokeWidth="12"
											strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
											strokeDashoffset={dashOffset}
											transform="rotate(-90 60 60)"
										/>
									)
								})
							})()}
							<text x="60" y="66" textAnchor="middle" className="fill-gray-700 text-lg font-semibold">
								{usedPercentage}%
							</text>
						</svg>
					</div>
					{stats && (
						<ul className="mt-3 space-y-1 text-xs text-gray-600">
							{storageSegments.map(segment => (
								<li key={segment.label} className="flex items-center gap-2">
									<span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
									<span className="flex-1">{segment.label}{segment.count !== undefined ? ` (${segment.count})` : ""}</span>
									<span>{formatSize(segment.bytes)}</span>
								</li>
							))}
							<li className="pt-1 text-gray-500">
								{formatSize(stats.totalUsedStorage)} of {formatSize(stats.availableStorage)} used
								<br />
								<Link to={RoutePaths.TenantAdmin.Billing} className="text-blue-600 hover:underline">Upgrade subscription for more storage</Link>
							</li>
						</ul>
					)}
				</div>

				<div className="card min-w-[220px] flex-1 p-4">
					<h2 className="mb-2 text-sm font-semibold text-gray-600">Number of Users</h2>
					<p className="text-center text-7xl font-bold text-gray-800">{stats?.numberOfUsers}</p>
					<p className="mt-1 text-xs text-gray-500">
						Active tenant accounts
						<br />
						<Link to={RoutePaths.TenantAdmin.Users} className="text-blue-600 hover:underline">Manage users</Link>
					</p>
				</div>

				<div className="card min-w-[320px] flex-[2_1_420px] p-4">
					<h2 className="mb-3 text-sm font-semibold text-gray-600">Weekly Activity (sample)</h2>
					<svg width="100%" height="150" viewBox="0 0 320 150" role="img" aria-label="Sample weekly activity graph">
						<line x1="0" y1="130" x2="320" y2="130" stroke="#d1d5db" strokeWidth="1" />
						<line x1="0" y1="10" x2="0" y2="130" stroke="#d1d5db" strokeWidth="1" />
						<polyline points={points} fill="none" stroke="#0ea5e9" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
						{graphSamples.map((value, index) => {
							const x = index * xStep
							const y = chartHeight - (value / 60) * chartHeight
							return <circle key={`${index}-${value}`} cx={x} cy={y} r="3" fill="#0ea5e9" />
						})}
					</svg>
				</div>
			</div>

			<div className="todo mt-2">
				<div>Dashboard should at least show:</div>
				<div className="pl-4">- Tier limits and limitations</div>
				- Current storage used<br />
				<div className="pl-4">- Purge unused blobs? (All? All older than?)</div>
				- Activity graph?<br />
				<div className="pl-4">- Storage over time graph</div>
				<div className="pl-4">- Activity per time graph (lookups, registrations, uploads etc.)</div>
			</div>
		</div>
	)
}
