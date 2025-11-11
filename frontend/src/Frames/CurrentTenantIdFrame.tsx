import { PropsWithChildren, useEffect, useState } from "react"
import { useAtom } from "jotai"
import { lastSelectedTenantIdAtom } from "../Utils/Atoms"
import { CurrentTenantIdContext } from "./CurrentTenantIdContext"


export const CurrentTenantIdFrame = ({ children }: PropsWithChildren) => {
	const [currentTenantId, setCurrentTenantId] = useState<number | null>(null)
	const [lastSelectedTenantId, setLastSelectedTenantId] = useAtom(lastSelectedTenantIdAtom)

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
