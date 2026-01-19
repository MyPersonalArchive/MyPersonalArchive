import { useAtomValue } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { accountsAtom, currentUserAtom } from "../Utils/Atoms"
import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { RoutePaths } from "../RoutePaths"

export const UserProfilePage = () => {
	const currentUser = useAtomValue(currentUserAtom)
	const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)
	const navigate = useNavigate()

	const accounts = useAtomValue(accountsAtom)

	const switchTenant = (tenantId: number) => {
		switchToTenantId(tenantId)
		navigate(RoutePaths.Index)
	}

	return (
		<>
			<h1 className="heading-1">
				My profile
			</h1>

			{
				currentUser !== undefined && currentUser.availableTenantIds.length > 1 &&
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
			}

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
					{
						accounts.length === 0
							? (
								<tr>
									<td colSpan={4} className="text-center italic text-gray-500 py-4">
										No connected accounts found
									</td>
								</tr>
							) :
							accounts.map(account => (
								<tr key={account.id}>
									<td>{account.displayName}</td>
									<td>{account.credentials}</td>
									<td>{account.type}</td>
									<td>{account.provider}</td>
								</tr>
							))
					}
				</tbody>
			</table>

		</>
	)
}