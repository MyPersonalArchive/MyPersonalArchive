import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { StoredFilter, storedFiltersAtom } from "./Atoms/storedFiltersAtom"
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


function mapResponseToModel(filters: GetResponse[] | undefined): StoredFilter[] {
	return filters?.map(fromBackend => ({
		id: fromBackend.id,
		name: fromBackend.name,
		filterDefinition: {
			title: fromBackend.filterDefinition.title,
			tags: fromBackend.filterDefinition.tags,
			metadataTypes: new Set<string>(fromBackend.filterDefinition.metadataTypes)
		}
	})) ?? []
}

// function mapModelToRequest(model: StoredFilter): GetResponse {
// 	return {
// 		id: model.id,
// 		name: model.name,
// 		filterDefinition: {
// 			title: model.filterDefinition.title,
// 			tags: model.filterDefinition.tags,
// 			metadataTypes: Array.from(model.filterDefinition.metadataTypes)
// 		}
// 	}
// }

export const useStoredFiltersPrefetching = () => {
	const dispatch = useSetAtom(storedFiltersAtom)
	const apiClient = useApiClient()


	useEffect(() => {
		apiClient.get<GetResponse[]>("/api/query/GetStoredFilters")
			.then(filtersFromResponse => {
				dispatch({ action: "LOAD", storedFilters: mapResponseToModel(filtersFromResponse) })
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "StoredFiltersUpdated": {
				apiClient.get<GetResponse[]>("/api/query/GetStoredFilters")
					.then(filtersFromResponse => {
						dispatch({ action: "LOAD", storedFilters: mapResponseToModel(filtersFromResponse) })
					})
				break
			}
		}
	})
}
