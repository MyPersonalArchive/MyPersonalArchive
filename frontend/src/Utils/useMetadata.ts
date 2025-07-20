import { useEffect, useReducer } from "react"
import { IMetadataCommand, MetadataState, MetadataType, metadataTypesReducer } from "../Components/Metadata/metadataTypesReducer"
import React from "react"

export const MetadataControlPath = Symbol("MetadataControl")

type MetadataControlState = {
    availableMetadataTypes: Set<string>,
    selectedMetadataTypes: Set<string>,
    metadata: Record<string, any>
}
const metadataControlReducer = (state: MetadataControlState, command: IMetadataCommand & Record<string, any>): any => {
    switch (command.action) {
        case "METADATA_LOADED": {
            const populatedMetadataTypes = new Set(Object.keys(command.metadata))
            Object.keys(command.metadata).forEach((path) => {
                command.dispatch(path)({ action: "METADATA_LOADED", metadata: command.metadata[path] })
            })
            return {
                ...state,
                selectedMetadataTypes: populatedMetadataTypes.intersection(state.availableMetadataTypes),
            }
        }

        case "TOGGLE_METADATA_TYPE": {
            if (state.availableMetadataTypes.has(command.type)) {
                return {
                    ...state,
                    selectedMetadataTypes: state.selectedMetadataTypes.has(command.type)
                        ? state.selectedMetadataTypes.difference(new Set([command.type]))
                        : state.selectedMetadataTypes.union(new Set([command.type]))
                }
            }
            return state // Ignore selection of items not in the set of all possible items
        }

        default:
            console.warn(`Unknown command action: ${command.action}`)
            return state
    }
}

export const useMetadata = (availableMetadataTypes: MetadataType[]): MetadataState & { dispatch: (path: string | symbol) => React.Dispatch<IMetadataCommand> } => {
    const xxxxx = { path: MetadataControlPath, empty: { metadata: {}, selectedMetadataTypes: {} }, reducer: metadataControlReducer }

    const initialState: MetadataState = {
        [MetadataControlPath]: {
            availableMetadataTypes: new Set(availableMetadataTypes
                .filter(({ path }) => typeof path === "string")
                .map(({ path }) => path as string)),
            selectedMetadataTypes: new Set<string>()
        }
    }

    const [state, dispatch] = useReducer(metadataTypesReducer([...availableMetadataTypes, xxxxx]), initialState)

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