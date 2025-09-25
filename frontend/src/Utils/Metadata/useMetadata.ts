import { useEffect, useReducer } from "react"
import { combinedReducer } from "./combinedReducer"
import { ICommand, MetadataState, MetadataType, ReducerIdentifier } from "./types"
import { MetadataControlPath, metadataControlReducer } from "./metadataControlReducer"


export const useMetadata = (availableMetadataTypes: MetadataType[]) => {
	const allReducers = new Map(availableMetadataTypes.map(metadataType => [metadataType.path, metadataType.reducer]))
	allReducers.set(MetadataControlPath, metadataControlReducer)

	const initialState: MetadataState = {
		[MetadataControlPath]: {
			availableMetadataTypes: new Set(availableMetadataTypes
				.filter(({ path }) => typeof path === "string")
				.map(({ path }) => path as string)),
			selectedMetadataTypes: new Set<string>()
		}
	}

	const [state, dispatch] = useReducer(combinedReducer(allReducers), initialState)

	// Initialize all metadata types
	useEffect(() => {
		availableMetadataTypes.forEach(({ path }) => {
			dispatch({ path, command: { action: "INIT" } })
		})
	}, [availableMetadataTypes])

	// Expose only the selected metadata types and their state
	const selectedTypes = state[MetadataControlPath].selectedMetadataTypes as Set<string>
	const metadataEntries = Object.entries(state)
		.filter(([key]) => selectedTypes.has(key))
	const metadata = Object.fromEntries(metadataEntries)

	return {
		availableMetadataTypes: state[MetadataControlPath].availableMetadataTypes as Set<string>,
		selectedMetadataTypes: state[MetadataControlPath].selectedMetadataTypes as Set<string>,
		metadata,
		dispatch: (path: ReducerIdentifier) => (command: ICommand) => {
			dispatch({ path, command })
		}
	}
}
