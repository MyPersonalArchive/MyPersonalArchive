import { useAtomValue } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { currentUserAtom } from "../Utils/Atoms"
import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { RoutePaths } from "../RoutePaths"

export const UserProfilePage = () => {
	const currentUser = useAtomValue(currentUserAtom)
	const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)
	const navigate = useNavigate()


	const switchTenant = (tenantId: number) => {
		switchToTenantId(tenantId)
		navigate(RoutePaths.Index)
	}

	return (
		<>
			<h1 className="heading-1">
				User Profile
			</h1>

			<div className="aligned-labels-and-inputs">
				<label htmlFor="tenant">Current tenant</label>
				<select className="input" 
					id="tenant"
					defaultValue={currentTenantId?.toString()}
					onChange={(e) => switchTenant(parseInt(e.target.value))}
				>
					{currentUser?.availableTenantIds?.map((tenantId) => (
						<option key={tenantId} value={tenantId}>
							{tenantId}
						</option>
					))}
				</select>
			</div>


			<h2 className="heading-2 mt-6">
				Connected Accounts
			</h2>
			<table className="w-full table with-column-seperators">
				<thead>
					<tr>
						<th>Display name</th>
						<th>Account</th>
						<th>Type</th>
						<th>Provider</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>peter.pan@zoho.example</td>
						<td>peter.pan@zoho.example</td>
						<td>Email (IMAP)</td>
						<td>Zoho mail</td>
					</tr>
					<tr>
						<td>My work mail</td>
						<td>peter@work.example</td>
						<td>Email (IMAP)</td>
						<td>GMail</td>
					</tr>
					<tr>
						<td>My private mail</td>
						<td>peter.private@fastmail.example</td>
						<td>Email (IMAP)</td>
						<td>Fastmail</td>
					</tr>
					<tr>
						<td>Dropbox (private)</td>
						<td>peter.private@fastmail.example</td>
						<td>Files</td>
						<td>Dropbox</td>
					</tr>
					<tr>
						<td>Onedrive at work</td>
						<td>peter@work.example</td>
						<td>Files</td>
						<td>Onedrive</td>
					</tr>
				</tbody>
			</table>

		</>
	)
}