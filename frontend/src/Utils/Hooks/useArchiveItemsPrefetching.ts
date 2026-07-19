import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { ArchiveItem, archiveItemsAtom } from "../Atoms/archiveItemsAtom"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"


type ListResponse = {
	id: UUID
	title: string
	tags: string[]
	documentDate?: string
	createdAt: string
	metadata: any
	blobDisplayInfos: {
		id: UUID
		numberOfPages: number
		mimeType?: string
	}[]
}

type GetResponse = {
	id: UUID
	title: string
	tags: string[]
	documentDate?: string
	createdAt: string
	metadata: any
	blobDisplayInfos: {
		id: UUID
		numberOfPages: number
		mimeType?: string
	}[]
}


export const useArchiveItemsPrefetching = () => {
	const setArchiveItems = useSetAtom(archiveItemsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.query<ListResponse[]>("ListArchiveItems")
			.then(response => setArchiveItems(response!.map(item => ({
				id: item.id,
				title: item.title,
				tags: item.tags,
				documentDate: item.documentDate ? new Date(item.documentDate) : undefined,
				createdAt: new Date(item.createdAt),
				metadata: item.metadata,
				blobIds: item.blobDisplayInfos.map(blob => blob.id)
			} as ArchiveItem))))
	}, [])

	useSignalR(async message => {
		switch (message.messageType) {
			case "ArchiveItemsAdded": {
				const archiveItemIds = message.data as UUID[]

				Promise
					.all(archiveItemIds.map(id => apiClient.query<GetResponse>("GetArchiveItem", { id })))
					.then(responses => responses.map(response => ({
						id: response!.id,
						title: response!.title,
						tags: response!.tags,
						documentDate: response!.documentDate ? new Date(response!.documentDate) : undefined,
						createdAt: new Date(response!.createdAt),
						metadata: response!.metadata,
						blobIds: response!.blobDisplayInfos.map(blob => blob.id)
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
				const archiveItemIds = message.data as UUID[]

				Promise
					.all(archiveItemIds.map(id => apiClient.query<GetResponse>("GetArchiveItem", { id })))
					.then(responses => responses.map(response => ({
						id: response!.id,
						title: response!.title,
						tags: response!.tags,
						documentDate: response!.documentDate ? new Date(response!.documentDate) : undefined,
						createdAt: new Date(response!.createdAt),
						metadata: response!.metadata,
						blobIds: response!.blobDisplayInfos.map(blob => blob.id)
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
				const archiveItemIds = message.data as UUID[]

				setArchiveItems(archiveItems => archiveItems.filter(archiveItem => !archiveItemIds.includes(archiveItem.id)))
				break
			}
		}
	})
}