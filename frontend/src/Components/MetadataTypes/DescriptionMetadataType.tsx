import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"

type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "SET_NOTES", notes: string }

type State = {
	notes: string
}

const reducer = (state: State, command: Command): State => {
	switch (command.action) {
		case "INIT":
			return {
				notes: "",
			}

		case "METADATA_LOADED":
			return {
				...state,
				...command.metadata
			}

		case "SET_NOTES":
			return {
				...state,
				notes: command.notes
			}

		default:
			return state
	}
}

const Component = (props: MetadataComponentProps) => {
	const state = props.state
	const dispatch = props.dispatch as React.Dispatch<Command>

	return (
		<textarea
			rows={4}
			value={state.notes} onChange={e => dispatch({ action: "SET_NOTES", notes: e.target.value })}
			className="input w-full"
			placeholder="Write your notes here..."
		>
		</textarea>
	)
}

export default {
	displayName: "Notes",
	path: "notes",
	component: Component,
	reducer
} as MetadataType