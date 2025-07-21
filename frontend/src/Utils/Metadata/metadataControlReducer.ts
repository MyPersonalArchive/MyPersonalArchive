import { ICommand } from "./types"


export const MetadataControlPath = Symbol("MetadataControl")

type MetadataControlState = {
    availableMetadataTypes: Set<string>
    selectedMetadataTypes: Set<string>
}

export const metadataControlReducer = (state: MetadataControlState, command: ICommand ): MetadataControlState => {
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
