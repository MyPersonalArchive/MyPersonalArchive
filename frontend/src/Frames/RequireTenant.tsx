import { PropsWithChildren, useContext } from "react"
import { useAtomValue } from "jotai"
import { loggedInUserAtom } from "../Utils/Atoms"
import { CurrentTenantIdContext } from "./CurrentTenantIdFrame"


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
    const loggedInUser = useAtomValue(loggedInUserAtom)!
    const { switchToTenantId } = useContext(CurrentTenantIdContext)

    return <div>
        <h1 className="heading-2">
            Select a Tenant
        </h1>
        <ul>
            {
                loggedInUser?.availableTenantIds.map(tenantId => (
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
