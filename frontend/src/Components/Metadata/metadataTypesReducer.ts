import { Dispatch } from "react"

export type reducer = (state: any, command: any) => unknown

export type metadataComponentProps = {
    state: unknown
    dispatch: Dispatch<unknown>
}

export type MetadataType = {
    name: string,
    path: string,
    empty: any,
    reducer: reducer,
    component: React.FC<metadataComponentProps>
}

interface IMetadataCommand {
    path: string,
    action: string
}
export const metadataTypesReducer = (metadataTypes: Array<MetadataType>) => (stateRoot: any, command: IMetadataCommand): unknown => {
    //TODO:
    // - stateRoot or states - object? new Map? array?
    // - command has a target path, which is the component path.
    // - the path is the identifier for the component
    // - send only to the component that matches the path
    // - no need to call all the reducers, only the one that matches the path
    // - can have a INIT command specific for each component

    // console.log("*** 1", stateRoot, command.path)


    const metadataType = metadataTypes.find(c => c.path === command.path)
    if (!metadataType) {
        console.warn(`No metadata type found for path: ${command.path}`)
        return stateRoot
    }

    const componentState = metadataType.reducer(stateRoot[metadataType.path], command)

    return {
        ...stateRoot,
        [metadataType.path]: componentState
    }
}


