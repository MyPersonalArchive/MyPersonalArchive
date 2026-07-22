import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { BlobMetadata, blobsAtom } from "../Atoms/blobsAtom"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"

type ListResponse = {
	id: UUID
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType: string
}

type GetResponse = {
	id: UUID
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType: string
}

export const useBlobsPrefetching = () => {
	const setBlobs = useSetAtom(blobsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.query<ListResponse[]>("ListBlobs")
			.then(response => {
				setBlobs(response!.map(blob => ({
					id: blob.id,
					fileName: blob.fileName,
					fileSize: blob.fileSize,
					pageCount: blob.pageCount,
					uploadedAt: new Date(blob.uploadedAt),
					uploadedByUser: blob.uploadedByUser,
					mimeType: blob.mimeType
				})))
			})
	}, [])

	useSignalR(message => {
		switch (message.messageType) {
			case "BlobsAdded": {
				const blobIds = message.data as UUID[]

				Promise
					.all(blobIds.map(id => apiClient.query<GetResponse>("GetBlob", { id })))
					.then(responses => responses.map(response => ({
						...response,
						uploadedAt: new Date(response!.uploadedAt)
					})) as BlobMetadata[])
					.then(addedBlobs => {
						setBlobs(blobs => [
							...blobs,
							...addedBlobs
						])
					})
				break
			}

			case "BlobsUpdated": {
				const blobIds = message.data as UUID[]

				Promise
					.all(blobIds.map(id => apiClient.query<GetResponse>("GetBlob", { id })))
					.then(responses => responses.map(response => ({
						...response,
						uploadedAt: new Date(response!.uploadedAt)
					})) as BlobMetadata[])
					.then(updatedBlobs => {
						setBlobs(blobs => [
							...blobs.filter(blob => !blobIds.includes(blob.id)),
							...updatedBlobs
						])
					})
				break
			}

			case "BlobsDeleted": {
				const blobIds = message.data as UUID[]

				setBlobs(blobs => blobs.filter(blob => !blobIds.includes(blob.id)))
				break
			}
		}
	})
}