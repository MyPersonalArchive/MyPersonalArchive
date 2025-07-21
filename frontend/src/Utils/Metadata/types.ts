
export type ReducerIdentifier = string | symbol

export type MetadataState = Record<ReducerIdentifier, any>

export interface ICommand {
    action: string
    [key: string]: any
}

export type MetadataReducer = React.Reducer<any, ICommand>

export type MetadataComponentProps = {
    state: Record<string | symbol, any>
    dispatch: React.Dispatch<ICommand>
}

export type MetadataType = {
    displayName: string
    path: ReducerIdentifier
    reducer: MetadataReducer
    component: React.FC<MetadataComponentProps>
}