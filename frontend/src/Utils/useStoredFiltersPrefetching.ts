import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { storedFiltersAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"


type ListResponse = {
	id: number
	name: string
	filterDefinition: {
		title?: string
		tags: string[]
		metadataTypes: string[]
	}
}

type GetResponse = {
	id: number
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
		apiClient.get<ListResponse[]>("/api/query/ListStoredFilters")
			.then(filters => {
				setStoredFilters(filters!)
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "StoredFiltersAdded": {
				const storedFilterIds = message.data as number[]

				Promise
					.all(storedFilterIds.map(id => apiClient.get<GetResponse>("/api/query/GetStoredFilter", { id })))
					.then(addedFilters => {
						setStoredFilters(filters => [
							...filters,
							...addedFilters.filter(f => f != null).map(f => ({
								id: f!.id,
								name: f!.name,
								filterDefinition: f!.filterDefinition
							}))
						])
					})
				break
			}
			case "StoredFiltersUpdated": {
				const storedFilterIds = message.data as number[]

				Promise
					.all(storedFilterIds.map(id => apiClient.get<GetResponse>("/api/query/GetStoredFilter", { id })))
					.then(updatedFilters => {
						setStoredFilters(filters => [
							...filters.filter(filter => !storedFilterIds.includes(filter.id)),
							...updatedFilters.filter(f => f != null).map(f => ({
								id: f!.id,
								name: f!.name,
								filterDefinition: f!.filterDefinition
							}))
						])
					})
				break
			}
			case "StoredFiltersDeleted": {
				const storedFilterIds = message.data as number[]

				setStoredFilters(filters => filters.filter(filter => !storedFilterIds.includes(filter.id)))
				break
			}
		}
	})
}