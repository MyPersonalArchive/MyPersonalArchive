import { useSetAtom } from "jotai"
import { useSignalR } from "./useSignalR"
import { unallocatedBlobsAtom } from "./Atoms"
import { useEffect } from "react"
import { useApiClient } from "./useApiClient"

export type UnallocatedBlobResponse = {
    total: number
    blobs: UnallocatedBlob[]
}

export type UnallocatedBlob = {
    id?: number
    fileName: string
    fileSize: number
    pageCount: number
    uploadedAt: Date
    uploadedByUser: string
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
        console.log("*** useUnallocatedBlobsPrefetching, message: ", message)
        
        switch(message.messageType) {
            case "NewUnallocatedBlob": {
                //setUnallocatedBlobs(unallocatedBlobs => [...unallocatedBlobs, message.data])
                //TODO: Update unallocated from signalR when blobs are uploaded.
                break
            }
        }
    })
}