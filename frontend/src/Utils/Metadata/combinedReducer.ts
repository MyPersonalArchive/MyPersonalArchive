import {ICommand, MetadataReducer, MetadataState, ReducerIdentifier } from "./types"


export interface IPathCommand {
    path: ReducerIdentifier
    command: ICommand
}

export const combinedReducer =
    (reducers: Map<ReducerIdentifier, MetadataReducer>) =>
    	(state: MetadataState, command: IPathCommand): MetadataState => {
    		const path = command.path
    		const reducer = reducers.get(command.path)
    		if (reducer === undefined) {
    			console.warn(`No metadata component type found for path: ${String(command.path)}`)
    			return state
    		}

    		const componentState = reducer(state[path], command.command)
    		return {
    			...state,
    			[path]: componentState
    		}
    	}
