import { useEffect, useReducer } from "react"
import { IMetadataCommand, MetadataState, MetadataType, combinedReducer } from "./combinedReducer"
import React from "react"
import { MetadataControlPath, metadataControlReducer } from "./metadataControlReducer"

export const useMetadata = (availableMetadataTypes: MetadataType[]): MetadataState & { dispatch: (path: string | symbol) => React.Dispatch<IMetadataCommand> } => {
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
            dispatch({ path, action: "INIT" })
        })
    }, [availableMetadataTypes])

    return {
        availableMetadataTypes: state[MetadataControlPath].availableMetadataTypes,
        selectedMetadataTypes: state[MetadataControlPath].selectedMetadataTypes,
        metadata: prepareMetadataForSave(state, state[MetadataControlPath].selectedMetadataTypes),
        dispatch: (path) => (command) => {
            dispatch({ path, ...command })
        }
    }
}

const prepareMetadataForSave = (metadata: any, selectedMetadataTypes: Set<string>) => {
    const metadataStateToSave = {} as any
    selectedMetadataTypes.forEach((path) => {
        metadataStateToSave[path] = metadata[path]
    })
    return metadataStateToSave
}