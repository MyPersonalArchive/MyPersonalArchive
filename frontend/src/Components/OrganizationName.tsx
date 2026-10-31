import { useAtom } from "jotai"
import { useEffect } from "react"
import { organizationNameAtom } from "../Utils/Atoms/organizationNameAtom"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useSignalR } from "../Utils/Hooks/useSignalR"



export const OrganizationName = ({ tenantId }: { tenantId: string }) => {
	const apiClient = useApiClient()
	const [organizationName, setOrganizationName] = useAtom(organizationNameAtom)
	const isCached = organizationName?.tenantId === tenantId

	useEffect(() => {
		if (isCached) {
			return
		}
		apiClient.query<string>("GetOrganizationName")
			.then(response => {
				if (response !== undefined) {
					setOrganizationName({ tenantId, name: response })
				}
			})
	}, [tenantId])

	useSignalR(message => {
		switch (message.messageType) {
			case "OrganizationNameUpdated": {
				setOrganizationName({ tenantId, name: message.data as string })
				break
			}
		}
	})

	return isCached ? organizationName.name : tenantId
}
