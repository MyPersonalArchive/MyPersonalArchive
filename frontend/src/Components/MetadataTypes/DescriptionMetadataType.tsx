import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"

type Command =
    | { action: "INIT" }
    | { action: "METADATA_LOADED", metadata: State }
    | { action: "SET_DESCRIPTION", description: string }

type State = {
    description: string
}

const reducer = (state: State, command: Command): State => {
    switch (command.action) {
        case "INIT":
            return {
                description: "",
            }

        case "METADATA_LOADED":
            return {
                ...state,
                ...command.metadata
            }

        case "SET_DESCRIPTION":
            return {
                ...state,
                description: command.description
            }

        default:
            return state
    }
}

const Component = (props: MetadataComponentProps) => {
    const state = props.state
    const dispatch = props.dispatch as React.Dispatch<Command>

    return (
        <>
            <textarea id="message" 
            rows={4} 
            value={state.description} onChange={e => dispatch({ action: "SET_DESCRIPTION", description: e.target.value })} 
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 dark:border-gray-600 dark:placeholder-gray-400 dark:text-gray-400" placeholder="Placeholder for description..."></textarea>
        </>
    )
}

export default {
    displayName: "Description",
    path: "description",
    component: Component,
    reducer
} as MetadataType