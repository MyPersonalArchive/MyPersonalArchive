import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { Blob, blobsAtom } from "./Atoms"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"

export type ListBlobResponse = {
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
		apiClient.get<ListBlobResponse[]>("/api/blob/list")
			.then(response => {
				setBlobs(response!.map(blob => ({
					...blob,
					uploadedAt: new Date(blob.uploadedAt)
				})))
			})
	}, [])

	useSignalR(message => {
		switch (message.messageType) {
			case "AddedBlobs": {
				// console.log("*** useUnallocatedBlobsPrefetching, message: ", message)
				setBlobs(unallocatedBlobs => [...unallocatedBlobs, ...(message.data as Blob[])])
				break
			}

			case "BlobsAllocated":
			case "BlobsDeleted": {
				// console.log("*** useUnallocatedBlobsPrefetching, message: ", message)
				setBlobs(unallocatedBlobs => unallocatedBlobs.filter(blob => !message.data.includes(blob.id)))
				break
			}
		}
	})
}