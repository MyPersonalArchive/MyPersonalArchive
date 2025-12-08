import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { ArchiveItem, archiveItemsAtom } from "./Atoms"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"


type ListResponse = {
	id: number
	title: string
	tags: string[]
	blobs: { id: number }[],
	metadataTypes: string[]
	createdAt: string
	documentDate?: string
}

type GetResponse = {
	id: number
	title: string
	tags: string[]
	blobs: { id: number, numberOfPages: number, mimeType?: string }[]
	metadata: object
	createdAt: string
	documentDate?: string
}


export const useArchiveItemsPrefetching = () => {
	const setArchiveItems = useSetAtom(archiveItemsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<ListResponse[]>("/api/archive/list")
			.then(response => setArchiveItems(response!.map(item => ({
				...item,
				createdAt: new Date(item.createdAt),
				documentDate: item.documentDate ? new Date(item.documentDate) : undefined
			} as ArchiveItem))))
	}, [])

	useSignalR(async message => {
		switch (message.messageType) {
			case "ArchiveItemsAdded": {
				const archiveItemIds = message.data as number[]

				Promise
					.all(archiveItemIds.map(id => apiClient.get<GetResponse>("/api/archive/get", { id })))
					.then(responses => responses.map(response => ({
						...response,
						blobs: response!.blobs.map(blob => ({id: blob.id})),
						metadataTypes: Object.keys(response!.metadata),
						createdAt: new Date(response!.createdAt),
						documentDate: response!.documentDate ? new Date(response!.documentDate) : undefined
					})) as ArchiveItem[])
					.then(addedArchiveItems => {
						setArchiveItems(archiveItems => [
							...archiveItems,
							...addedArchiveItems
						])
					})
				break
			}

			case "ArchiveItemsUpdated": {
				const archiveItemIds = message.data as number[]

				Promise
					.all(archiveItemIds.map(id => apiClient.get<GetResponse>("/api/archive/get", { id })))
					.then(responses => responses.map(response => ({
						...response,
						blobs: response!.blobs.map(blob => ({id: blob.id})),
						metadataTypes: Object.keys(response!.metadata),
						createdAt: new Date(response!.createdAt),
						documentDate: response!.documentDate ? new Date(response!.documentDate) : undefined
					})) as ArchiveItem[])
					.then(updatedArchiveItems => {
						setArchiveItems(archiveItems => [
							...archiveItems.filter(archiveItem => !archiveItemIds.includes(archiveItem.id)),
							...updatedArchiveItems
						])
					})
				break
			}

			case "ArchiveItemsDeleted": {
				const archiveItemIds = message.data as number[]

				setArchiveItems(archiveItems => archiveItems.filter(archiveItem => !archiveItemIds.includes(archiveItem.id)))
				break
			}
		}
	})
}