import { useReducer } from "react"
import { IMetadataCommand, MetadataState, MetadataType, metadataTypesReducer } from "../Components/Metadata/metadataTypesReducer"

type MetadataControlState = {
    availableMetadataTypes: Set<string>,
    selectedMetadataTypes: Set<string>,
    metadata: Record<string, any>
}
const metadataControlReducer = (state: MetadataControlState, command: IMetadataCommand & Record<string, any>): any => {
    switch (command.action) {
        case "METADATA_LOADED": {
            const populatedMetadataTypes = new Set(Object.keys(command.metadata))
            return {
                ...state,
                selectedMetadataTypes: populatedMetadataTypes.intersection(state.availableMetadataTypes),
                metadata: {
                    ...state.metadata,
                    ...command.metadata
                }
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

export const useMetadata = (availableMetadataTypes: MetadataType[]): MetadataState & { dispatch: React.Dispatch<IMetadataCommand> } => {
    const initialState: MetadataState = {
        availableMetadataTypes: new Set(availableMetadataTypes.map(({ path }) => path)),
        selectedMetadataTypes: new Set<string>(),
        metadata: availableMetadataTypes.reduce((acc, { path, empty }) => ({ ...acc, [path]: { ...empty } }), {}),
    }

    const [state, dispatch] = useReducer(metadataTypesReducer([...availableMetadataTypes, { path: "", empty: { metadata: {}, selectedMetadataTypes: {} }, reducer: metadataControlReducer }]), initialState)

    return {
        availableMetadataTypes: state.availableMetadataTypes,
        selectedMetadataTypes: state.selectedMetadataTypes,
        metadata: state.metadata,
        dispatch
    }
}
