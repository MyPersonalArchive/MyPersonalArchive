import { useEffect, useReducer } from "react"
import { combinedReducer } from "./combinedReducer"
import { ICommand, MetadataState, MetadataType } from "./types"
import React from "react"
import { MetadataControlPath, metadataControlReducer } from "./metadataControlReducer"


export const useMetadata = (availableMetadataTypes: MetadataType[]): MetadataState & { dispatch: (path: string | symbol) => React.Dispatch<ICommand> } => {
    const allReducers = new Map(availableMetadataTypes.map(metadataType => [metadataType.path, metadataType.reducer]))
    allReducers.set(MetadataControlPath, metadataControlReducer)

    const initialState: MetadataState = {
        [MetadataControlPath]: {
            availableMetadataTypes: new Set(availableMetadataTypes
                .filter(({ path }) => typeof path === "string")
                .map(({ path }) => path as string)),
            selectedMetadataTypes: new Set<string>()
        }
    }

    const [state, dispatch] = useReducer(combinedReducer(allReducers), initialState)

    useEffect(() => {
        availableMetadataTypes.forEach(({ path }) => {
            dispatch({ path, command: { action: "INIT" } })
        })
    }, [availableMetadataTypes])

    const selectedTypes = state[MetadataControlPath].selectedMetadataTypes as Set<string>
    const metadataEntries = Object.entries(state)
        .filter(([key]) => selectedTypes.has(key))
    const metadata = Object.fromEntries(metadataEntries)

    return {
        availableMetadataTypes: state[MetadataControlPath].availableMetadataTypes,
        selectedMetadataTypes: state[MetadataControlPath].selectedMetadataTypes,
        metadata,
        dispatch: (path) => (command) => {
            dispatch({ path, command })
        }
    }
}
