import { useAtomValue } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
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
				My profile
			</h1>

			{ currentUser !== undefined && currentUser.availableTenantIds.length > 1 &&
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

			<Link className="link" to={RoutePaths.SignOut}>
				Sign out
			</Link>
		</>
	)
}
