import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { storedFiltersAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"
import { UUID } from "crypto"

type GetResponse = {
	id: UUID
	name: string
	filterDefinition: {
		title?: string
		tags: string[]
		metadataTypes: string[]
	}
}

export const useStoredFiltersPrefetching = () => {
	const setStoredFilters = useSetAtom(storedFiltersAtom)
	const apiClient = useApiClient()


	useEffect(() => {
		apiClient.get<GetResponse[]>("/api/query/GetStoredFilters")
			.then(filters => {
				setStoredFilters(filters!)
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "StoredFiltersUpdated": {

				apiClient.get<GetResponse[]>("/api/query/GetStoredFilters")
					.then(filters => {
						setStoredFilters(filters!)
					})
				break
			}
		}
	})
}