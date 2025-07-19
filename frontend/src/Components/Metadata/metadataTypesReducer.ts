import { Dispatch } from "react"


export type reducer = (state: any, command: any) => unknown

export type metadataComponentProps = {
    state: unknown
    dispatch: Dispatch<unknown>
}

interface IMetadataType {
    path: string,
    empty: any
    reducer: reducer,
}

export type MetadataType = IMetadataType & {
    name: string,
    path: string,
    empty: any
    reducer: reducer,
    component: React.FC<metadataComponentProps>
}

export type MetadataState = {
    availableMetadataTypes: Set<String>,
    selectedMetadataTypes: Set<string>,
    metadata: Record<string, any>
}
export interface IMetadataCommand {
    path: string,
    action: string
}
export const metadataTypesReducer = (metadataTypes: Array<IMetadataType>) => (state: MetadataState, command: IMetadataCommand): MetadataState => {
    const metadataTypeFromCommand = metadataTypes.find(c => c.path === command.path)
    
    if (!metadataTypeFromCommand) {
        console.warn(`No metadata component type found for path: ${command.path}`)
        return state
    }

    if (metadataTypeFromCommand.path === "") {
        return metadataTypeFromCommand.reducer(state, command) as MetadataState
    }

    const componentState = metadataTypeFromCommand.reducer(state.metadata[metadataTypeFromCommand.path], command)
    return {
        ...state,
        metadata: {
            ...state.metadata,
            [metadataTypeFromCommand.path]: componentState
        }
    }
}


