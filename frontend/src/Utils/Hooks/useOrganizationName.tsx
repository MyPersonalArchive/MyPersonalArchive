import { useAtom } from "jotai"
import { useEffect } from "react"
import { organizationNameAtom } from "../Atoms/organizationNameAtom"
import { useApiClient } from "./useApiClient"
import { useSignalR } from "./useSignalR"


export const useOrganizationName = (tenantId: string) => {
	const [organizationName, setOrganizationName] = useAtom(organizationNameAtom)
	const isCached = organizationName?.tenantId === tenantId

	const apiClient = useApiClient()

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

	return {
		organizationName: isCached ? organizationName.name : undefined,
		setOrganizationName: (name: string) => { setOrganizationName({ tenantId, name: name }) }
	}
}
