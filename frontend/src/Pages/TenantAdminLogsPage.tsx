

export const TenantAdminLogsPage = () => {

	return (
		<div className="form">
			<header className="header">
				<h1>Logs</h1>
			</header>

			<div className="flex flex-row gap-0">
				<div className="flex flex-row gap-2 ">
					<span className="border-l border-t border-r rounded-t border-gray-300 text-gray-500 p-2">User access log</span>
					<span className="rounded-t bg-gray-200 p-2">Backup log</span>
					<span className="border-l border-t border-r rounded-t border-gray-300 text-gray-500 p-2">Another log</span>
					<span className="border-l border-t border-r rounded-t border-gray-300 text-gray-500 p-2">Yet another log</span>
				</div>
			</div>

			<div className="log w-full">
				<div>2026-07-23 13:01:12.000: Backed up <span title="Receipt for watercooler">archiveitem#d178c2d4-9c0d-48e4-b398-79262d564873</span> to <span title="Stian's computer">target#816d499d-aec6-4880-b906-69e05cc6bce0</span></div>
				<div>2026-07-23 13:01:12.020: Backed up <span title="Letter from the IRS">archiveitem#d178c2d5-9c0d-48e4-b398-79262d564873</span> to <span title="Stian's computer">target#816d499e-aec6-4880-b906-69e05cc6bce0</span></div>
				<div>2026-07-23 13:01:12.030: Backed up <span title="Contract with supplier">archiveitem#d178c2d6-9c0d-48e4-b398-79262d564873</span> to <span title="Stian's computer">target#816d499f-aec6-4880-b906-69e05cc6bce0</span></div>
			</div>

			<div className="flex flex-row gap-0 my-2">
				{/* <div className="flex-1"></div> */}
				<button className="btn btn-primary">Download log</button>
			</div>
		</div>
	)
}
