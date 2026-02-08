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


function mapResponseToModel(filters: GetResponse[] | undefined): import("/workspaces/MyPersonalArchive/frontend/src/Utils/Atoms/storedFiltersAtom").StoredFilter[] {
	return filters?.map(fromBackend => ((backendModel: GetResponse): StoredFilter => {
		return {
			id: backendModel.id,
			name: backendModel.name,
			filterDefinition: {
				title: backendModel.filterDefinition.title,
				tags: backendModel.filterDefinition.tags,
				metadataTypes: new Set<string>(backendModel.filterDefinition.metadataTypes)
			}
		}
	})(fromBackend)) ?? []
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
