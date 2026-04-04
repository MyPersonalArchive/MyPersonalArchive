import { PropsWithChildren, useContext } from "react"
import { useAtomValue } from "jotai"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { CurrentTenantIdContext } from "./CurrentTenantIdContext"


export const RequireTenant = ({ children }: PropsWithChildren) => {
	const { currentTenantId } = useContext(CurrentTenantIdContext)

	return <>
		{
			currentTenantId === null
				? <TenantIdSelector />
				: <>{children}</>
		}
	</>
}


export const TenantIdSelector = () => {
	const currentUser = useAtomValue(currentUserAtom)
	const { switchToTenantId } = useContext(CurrentTenantIdContext)

	return <div>
		<header className="header">
			<h2>
				Select a Tenant
			</h2>
		</header>
		<ul>
			{
				currentUser?.availableTenantIds.map(tenantId => (
					<li key={tenantId}>
						<button onClick={() => switchToTenantId(tenantId)}>
							{tenantId}
						</button>
					</li>
				))
			}
		</ul>
	</div>
}
