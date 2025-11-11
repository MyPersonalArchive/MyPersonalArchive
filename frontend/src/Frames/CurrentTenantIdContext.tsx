import { createContext } from "react"


type CurrentTenantIdContextProps = {
	currentTenantId: number | null
	switchToTenantId: (tenantId: number | null) => void
}

export const defaultValue: CurrentTenantIdContextProps = {
	currentTenantId: null,
	switchToTenantId: () => { }
}

export const CurrentTenantIdContext = createContext(defaultValue)
