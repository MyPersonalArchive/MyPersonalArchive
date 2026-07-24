

export const TenantAdminDashboardPage = () => {
	const numberOfUsers = 3

	const gaugeSamples = [
		{ label: "Storage", value: 68, color: "#2563eb" },
		{ label: "Cache use", value: 42, color: "#16a34a" }
	]

	const handlePurgeCache = () => {
		console.log("Purge cache clicked")
	}

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
				<div className="todo mt-2">
					//TODO: Implement this, since this is a placeholder/sample page
				</div>
			</header>

			<div className="flex flex-wrap gap-6">
				{gaugeSamples.map((sample) => {
					const radius = 42
					const circumference = 2 * Math.PI * radius
					const dashOffset = circumference * (1 - sample.value / 100)

					return (
						<div key={sample.label} className="min-w-[220px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
							<h2 className="mb-3 text-sm font-semibold text-gray-600">{sample.label}</h2>
							<div className="flex items-center justify-center">
								<svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`${sample.label} at ${sample.value} percent`}>
									<circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
									<circle
										cx="60"
										cy="60"
										r={radius}
										fill="none"
										stroke={sample.color}
										strokeWidth="12"
										strokeLinecap="round"
										strokeDasharray={circumference}
										strokeDashoffset={dashOffset}
										transform="rotate(-90 60 60)"
									/>
									<text x="60" y="66" textAnchor="middle" className="fill-gray-700 text-lg font-semibold">
										{sample.value}%
									</text>
								</svg>
							</div>
							{sample.label === "Cache use" ? (
								<button
									type="button"
									onClick={handlePurgeCache}
									className="mt-3 w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
								>
									Purge Cache
								</button>
							) : null}
						</div>
					)
				})}

				<div className="min-w-[220px] flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<h2 className="mb-2 text-sm font-semibold text-gray-600">Number of Users</h2>
					<p className="text-4xl font-bold text-gray-800">{numberOfUsers}</p>
					<p className="mt-1 text-xs text-gray-500">Active tenant accounts</p>
				</div>

				<div className="min-w-[320px] flex-[2_1_420px] rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
					<h2 className="mb-3 text-sm font-semibold text-gray-600">Weekly Activity</h2>
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
				- Current tier<br />
				<div className="pl-4">- Tier limits and limitations</div>
				- Current storage used<br />
				<div className="pl-4">- Purge unused blobs? (All? All older than?)</div>
				- Current cache used<br />
				<div className="pl-4">- <span className="line-through">Purge cache?</span></div>
				<div className="pl-8">- No, clearing cache will only cost us CPU-time when all cached items will be regenerated.</div>
				- Activity graph?<br />
				<div className="pl-4">- Storage graph</div>
				<div className="pl-4">- Activity graph showing lookups, registrations, uploads etc.</div>
			</div>
		</div>
	)
}
