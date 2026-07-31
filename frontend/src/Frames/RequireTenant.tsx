import { PropsWithChildren, useContext } from "react"
import { CurrentTenantIdContext } from "./CurrentTenantIdContext"


export const RequireTenant = ({ children }: PropsWithChildren) => {
	const { currentTenantId } = useContext(CurrentTenantIdContext)

	return <>
		{
			currentTenantId === null
				? <div>No tenant selected</div>
				: <>{children}</>
		}
	</>
}

