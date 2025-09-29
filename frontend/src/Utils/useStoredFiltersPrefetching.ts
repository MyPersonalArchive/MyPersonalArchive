import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { StoredFilter, storedFiltersAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"

export const useStoredFiltersPrefetching = () => {
	const setStoredFilters = useSetAtom(storedFiltersAtom)
	const apiClient = useApiClient()


	useEffect(() => {
		apiClient.get<StoredFilter[]>("/api/StoredFilter/list")
			.then(filters => {
				setStoredFilters(filters)
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "StoredFilterCreated": {
				setStoredFilters(filters => [...filters, message.data])
				break
			}
			case "StoredFilterDeleted": {
				setStoredFilters(filters => filters.filter(filter => filter.id !== message.data.id))
				break
			}
			case "StoredFilterUpdated": {
				setStoredFilters(filters => filters.map(filter => filter.id === message.data.id ? message.data : filter))
				break
			}
		}
	})
}