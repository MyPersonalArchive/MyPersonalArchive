import { PropsWithChildren, useEffect } from "react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { currentTenantIdAtom, lastSelectedTenantIdAtom, loggedInUserAtom } from "../Utils/Atoms"
import { useRefresh } from "../Utils/useApiClient"


export const RequireTenant = ({ children }: PropsWithChildren) => {
    const loggedInUser = useAtomValue(loggedInUserAtom)
    const [lastSelectedTenantId, setLastSelectedTenantId] = useAtom(lastSelectedTenantIdAtom)
    const [currentTenantId, setCurrentTenantId] = useAtom(currentTenantIdAtom)

    const refresh = useRefresh()
    // 1. if user has only one tenant, select it
    // 2. else if user has a last-used-tenant, select it
    // 3. else if user has multiple tenants, show a tenant selection screen
    //    - show a list of tenants
    //    - if user selects a tenant, store it in local storage and continue
    // 4. else fail - should not happen

    useEffect(() => {
        if (loggedInUser === undefined) {
            refresh()
        }
    }, [])

    if (loggedInUser === undefined) {
        return <></>    // This should never happen
    }
    
    if (loggedInUser.availableTenantIds.length === 1) {
        setCurrentTenantId(loggedInUser.availableTenantIds[0])
        setLastSelectedTenantId(loggedInUser.availableTenantIds[0])
    } else if (lastSelectedTenantId !== undefined && loggedInUser.availableTenantIds.includes(lastSelectedTenantId!)) {
        setCurrentTenantId(lastSelectedTenantId!)
    }

    return <>
        {
            currentTenantId === undefined
                ? <TenantIdSelector />
                : <>{children}</>
        }
    </>
}


export const TenantIdSelector = () => {
    const loggedInUser = useAtomValue(loggedInUserAtom)!
    const setLastSelectedTenantId = useSetAtom(lastSelectedTenantIdAtom)
    const setCurrentTenantId = useSetAtom(currentTenantIdAtom)

    const selectTenantId = (tenantId: number) => {
        setCurrentTenantId(tenantId)
        setLastSelectedTenantId(tenantId)
    }

    return <div>
        <h1>Select a Tenant</h1>
        <ul>
            {
                loggedInUser.availableTenantIds.map(tenantId => (
                    <li key={tenantId}>
                        <button onClick={() => selectTenantId(tenantId)}>
                            {tenantId}
                        </button>
                    </li>
                ))
            }
        </ul>
    </div>
}
