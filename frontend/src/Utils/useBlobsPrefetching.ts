import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { Blob, blobsAtom } from "./Atoms"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"

type ListResponse = {
	id: number
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType?: string
	isAllocated: boolean
}

type GetResponse = {
	id: number
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType?: string
	isAllocated: boolean
}

export const useBlobsPrefetching = () => {
	const setBlobs = useSetAtom(blobsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<ListResponse[]>("/api/blob/list")
			.then(response => {
				setBlobs(response!.map(blob => ({
					...blob,
					uploadedAt: new Date(blob.uploadedAt)
				})))
			})
	}, [])

	useSignalR(message => {
		switch (message.messageType) {
			case "BlobsAdded": {
				const blobIds = message.data as number[]

				Promise
					.all(blobIds.map(id => apiClient.get<GetResponse>("/api/blob/get", { id })))
					.then(responses => responses.map(response => ({
						...response,
						uploadedAt: new Date(response!.uploadedAt)
					})) as Blob[])
					.then(addedBlobs => {
						setBlobs(blobs => [
							...blobs,
							...addedBlobs
						])
					})
				break
			}

			case "BlobsUpdated": {
				const blobIds = message.data as number[]

				Promise
					.all(blobIds.map(id => apiClient.get<GetResponse>("/api/blob/get", { id })))
					.then(responses => responses.map(response => ({
						...response,
						uploadedAt: new Date(response!.uploadedAt)
					})) as Blob[])
					.then(updatedBlobs => {
						setBlobs(blobs => [
							...blobs.filter(blob => !blobIds.includes(blob.id)),
							...updatedBlobs
						])
					})
				break
			}

			case "BlobsDeleted": {
				const blobIds = message.data as number[]

				setBlobs(blobs => blobs.filter(blob => !blobIds.includes(blob.id)))
				break
			}
		}
	})
}