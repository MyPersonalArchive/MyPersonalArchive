import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { PredefinedSearch, predefinedSearchesAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"

export const usePredefinedSearchesPrefetching = () => {
    const setPredefinedSearches = useSetAtom(predefinedSearchesAtom)
    const apiClient = useApiClient()


    useEffect(() => {
        apiClient.get<PredefinedSearch[]>("/api/predefinedSearch/list")
            .then(searches => {
                setPredefinedSearches(searches)
            })
    }, [])

    useSignalR((message: SignalRMessage) => {
        switch (message.messageType) {
        case "PredefinedSearchCreated":{
            setPredefinedSearches(searches => [...searches, message.data])
            break
        }
        case "PredefinedSearchDeleted":{
            setPredefinedSearches(searches => searches.filter(search => search.id !== message.data))
            break
        }
        case "PredefinedSearchUpdated":{
            setPredefinedSearches(searches => searches.map(search => search.id === message.data.id ? message.data : search))
            break
        }
        }
    })
}