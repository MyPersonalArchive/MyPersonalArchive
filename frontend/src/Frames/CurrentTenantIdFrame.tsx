import { createContext, PropsWithChildren, useEffect, useState } from "react"
import { useRefresh } from "../Utils/useApiClient"
import { useAtom } from "jotai"
import { lastSelectedTenantIdAtom } from "../Utils/Atoms"


type CurrentTenantIdContextProps = {
    currentTenantId: number | null
    switchToTenantId: (tenantId: number | null) => void
}

const defaultValue: CurrentTenantIdContextProps = {
	currentTenantId: null,
	switchToTenantId: () => { }
}

export const CurrentTenantIdContext = createContext(defaultValue)


export const CurrentTenantIdFrame = ({ children }: PropsWithChildren) => {
	const [currentTenantId, setCurrentTenantId] = useState<number | null>(null)
	const [lastSelectedTenantId, setLastSelectedTenantId] = useAtom(lastSelectedTenantIdAtom)

	const refresh = useRefresh()

	useEffect(() => {
		refresh()
	}, [])

	useEffect(() => {
		if (lastSelectedTenantId !== undefined) {
			setCurrentTenantId(lastSelectedTenantId)
		}
	}, [lastSelectedTenantId])


	const switchToTenantId = (tenantId: number | null) => {
		setCurrentTenantId(tenantId)
		setLastSelectedTenantId(tenantId)
	}

	return (
		<CurrentTenantIdContext.Provider value={{ currentTenantId, switchToTenantId }}>
			{children}
		</CurrentTenantIdContext.Provider>
	)
}
