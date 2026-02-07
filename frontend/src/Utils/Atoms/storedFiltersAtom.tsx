import { randomUUID, UUID } from "crypto"
import { atomWithReducer } from "jotai/utils"
import { changeAtIndex, moveInArray, removeAtIndex } from "../array-helpers"


export type StoredFilter = {
	id: UUID
	name: string
	filterDefinition: {
		title?: string
		tags: string[]
		metadataTypes: string[]
	}
}
// export const storedFiltersAtom = atom<StoredFilter[]>([])


type Command =
	| { action: "LOAD", storedFilters: StoredFilter[] }
	| { action: "ADD_FILTER" }
	| { action: "REMOVE_FILTER", index: number }
	| { action: "MOVE_FILTER", fromIndex: number, toIndex: number }
	| { action: "EDIT_FILTER_NAME", index: number, name: string }
	| { action: "EDIT_FILTER_DEFINITION_TITLE", index: number, title?: string }
	| { action: "EDIT_FILTER_DEFINITION_TAGS", index: number, tags: string[] }
	| { action: "EDIT_FILTER_DEFINITION_METADATATYPES", index: number, metadataTypes: string[] }

const reducer = (state: StoredFilter[], command: Command): StoredFilter[] => {
	switch (command.action) {
		case "LOAD":
			return [...command.storedFilters]

		case "REMOVE_FILTER":
			return removeAtIndex(state, command.index)

		case "MOVE_FILTER":
			return moveInArray(state, command.fromIndex, command.toIndex)

		case "ADD_FILTER":
			return [...state, {
				id: randomUUID(),
				name: "",
				filterDefinition: {
					title: undefined,
					tags: [],
					metadataTypes: []
				}
			}]

		case "EDIT_FILTER_NAME":
			return changeAtIndex(
				state,
				command.index,
				filter => ({
					...filter,
					name: command.name
				})
			)

		case "EDIT_FILTER_DEFINITION_TITLE":
			return changeAtIndex(
				state,
				command.index,
				filter => ({
					...filter,
					filterDefinition: {
						...filter.filterDefinition,
						title: command.title
					}
				})
			)


		case "EDIT_FILTER_DEFINITION_TAGS":
			return changeAtIndex(
				state,
				command.index,
				filter => ({
					...filter,
					filterDefinition: {
						...filter.filterDefinition,
						tags: command.tags
					}
				})
			)


		case "EDIT_FILTER_DEFINITION_METADATATYPES":
			return changeAtIndex(
				state,
				command.index,
				filter => ({
					...filter,
					filterDefinition: {
						...filter.filterDefinition,
						metadataTypes: command.metadataTypes
					}
				})
			)
	}
}

export const storedFiltersAtom = atomWithReducer<StoredFilter[], Command>([], reducer)
