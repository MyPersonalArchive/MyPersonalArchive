import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { LabelItem, labelsAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"

export const useLabelsPrefetching = () => {
    const setLabels = useSetAtom(labelsAtom)
    const apiClient = useApiClient()


    useEffect(() => {
        apiClient.get<LabelItem[]>("/api/label/list")
            .then(labels => {
                setLabels(labels)
            })
    }, [])

    useSignalR((message: SignalRMessage) => {
        switch (message.data) {
            case "LabelCreated":{
                apiClient.get<LabelItem[]>("/api/label/list")
                    .then(labels => {
                        setLabels(labels)
                    })
                break
            }
            case "LabelDeleted":{
                apiClient.get<LabelItem[]>("/api/label/list")
                    .then(labels => {
                        setLabels(labels)
                    })
                break
            }
        }
    })
}