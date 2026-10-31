import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { useAtomValue } from "jotai"
import { useAdjustmentsMode } from "../Utils/Hooks/useAdjustmentsMode"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useOrganizationName } from "../Utils/Hooks/useOrganizationName"



export const CurrentOrganizationName = ({ editableInAdjustmentsMode = false }: { editableInAdjustmentsMode?: boolean }) => {
	const currentUser = useAtomValue(currentUserAtom)!
	const tenantId = currentUser.tenantId

	const {organizationName, setOrganizationName} = useOrganizationName(tenantId)

	const apiClient = useApiClient()

	const adjustmentsModeIsOpen = useAdjustmentsMode(() => {
		apiClient.execute("RenameOrganization", { newName: organizationName })
	})

	return editableInAdjustmentsMode && adjustmentsModeIsOpen
		? <input type="text" className="organization-name-input" value={organizationName} onChange={e => setOrganizationName(e.target.value)} />
		: organizationName
}



