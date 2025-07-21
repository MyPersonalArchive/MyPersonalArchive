import { Dispatch } from "react"


export type Reducer = (state: any, command: any) => unknown

export type MetadataComponentProps = {
    state: Record<string | symbol, any>
    dispatch: Dispatch<IMetadataCommand>
}

export type ReducerIdentifier = string | symbol

export type MetadataType = {
    displayName: string
    path: ReducerIdentifier
    reducer: Reducer
    component: React.FC<MetadataComponentProps>
}

export type MetadataState = Record<ReducerIdentifier, any>
export interface IMetadataCommand {
    action: string
    [key: string]: any
}

export const combinedReducer = (reducers: Map<ReducerIdentifier, Reducer>) => (state: MetadataState, command: IMetadataCommand): MetadataState => {
    const path = command.path
    const reducer = reducers.get(command.path)
    if (reducer === undefined) {
        console.warn(`No metadata component type found for path: ${String(command.path)}`)
        return state
    }

    const componentState = reducer(state[path], command)
    return {
        ...state,
        [path]: componentState
    }
}


