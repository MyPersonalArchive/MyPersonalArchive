import { Dispatch } from "react"


export type reducer = (state: any, command: any) => unknown

export type metadataComponentProps = {
    state: unknown
    dispatch: Dispatch<unknown>
}

interface IMetadataType {
    path: string | symbol
    empty: any
    reducer: reducer
}

export type MetadataType = IMetadataType & {
    name: string
    path: string | symbol
    empty: any
    reducer: reducer
    component: React.FC<metadataComponentProps>
}

export type MetadataState = Record<string | symbol, any>
export interface IMetadataCommand {
    path: string | symbol
    action: string
}
export const metadataTypesReducer = (metadataTypes: Array<IMetadataType>) => (state: MetadataState, command: IMetadataCommand): MetadataState => {
    const metadataTypeFromCommand = metadataTypes.find(c => c.path === command.path)

    if (!metadataTypeFromCommand) {
        console.warn(`No metadata component type found for path: ${String(command.path)}`)
        return state
    }

    const componentState = metadataTypeFromCommand.reducer(state[metadataTypeFromCommand.path], command)
    return {
        ...state,
        [metadataTypeFromCommand.path]: componentState
    }
}


