import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { UnallocatedBlob, unallocatedBlobsAtom } from "./Atoms"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"

export type UnallocatedBlobResponse = {
    total: number   //TODO: Why number? It isnt used anywhere
    blobs: UnallocatedBlob[]
}

export const useUnallocatedBlobsPrefetching = () => {
    const setUnallocatedBlobs = useSetAtom(unallocatedBlobsAtom)
    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<UnallocatedBlobResponse>("/api/blob/unallocatedBlobs")
            .then(response => {
                setUnallocatedBlobs(response.blobs)
            })
    }, [])

    useSignalR(message => {
        switch (message.messageType) {
            case "AddedBlobs": {
                console.log("*** useUnallocatedBlobsPrefetching, message: ", message)
                setUnallocatedBlobs(unallocatedBlobs => [...unallocatedBlobs, ...(message.data as UnallocatedBlob[])])
                break
            }
            case "BlobsAllocated":
            case "BlobDeleted": {
                console.log("*** useUnallocatedBlobsPrefetching, message: ", message)
                setUnallocatedBlobs(unallocatedBlobs => unallocatedBlobs.filter(blob => !message.data.includes(blob.id)))
                break
            }
        }
    })
}