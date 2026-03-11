import { UUID } from "crypto"
import { atomWithReducer } from "jotai/utils"
import { changeAtKey, moveInArray, removeAtKey } from "../array-helpers"
import { MimeTypeConverterArray } from "../../Components/DragDropHelpers"



export type StoredFilter = {
	id: UUID
	name: string
	filterDefinition: FilterDefinition
}

export type FilterDefinition = {
	title?: string
	tags: string[]
	metadataTypes: Set<string>
}


export const storedFiltersMimeTypeConverters: MimeTypeConverterArray<StoredFilter, number> = [
	{
		mimeType: "application/stored-filter+index+json",
		convertDragDataToPayload: (_, index) => ({ index }),
		convertDropPayloadToAction: (fromIndex, toIndex, _) => ({ action: "MOVE_FILTER", fromIndex, toIndex })
	},
	{
		mimeType: "application/stored-filter-definition+json",
		convertDragDataToPayload: (filter, _) => (filter),
		convertDropPayloadToAction: (_1, _2, filter) => ({ action: "ADD_FILTER", name: `Copy of ${filter.name}`, filterDefinition: filter.filterDefinition })
	},
	{
		mimeType: "text",
		convertDragDataToPayload: (storedFilter, _) => `${storedFilter.name}`,
	}
]


type StoredFiltersCommand =
	| { action: "LOAD", storedFilters: StoredFilter[] }
	| { action: "ADD_FILTER", name: string, filterDefinition?: FilterDefinition }
	| { action: "REMOVE_FILTER", id: UUID }
	| { action: "CLEAR_FILTER", id: UUID }
	| { action: "MOVE_FILTER", fromIndex: number, toIndex: number }
	| { action: "EDIT_FILTER_NAME", id: UUID, name: string }
	| { action: "EDIT_FILTER_DEFINITION_TITLE", id: UUID, title?: string }
	| { action: "EDIT_FILTER_DEFINITION_TAGS", id: UUID, tags: string[] }
	| { action: "EDIT_FILTER_DEFINITION_METADATATYPES", id: UUID, metadataTypes: Set<string> }

const reducer = (state: StoredFilter[], command: StoredFiltersCommand): StoredFilter[] => {
	switch (command.action) {
		case "LOAD":
			return [...command.storedFilters]

		case "REMOVE_FILTER":
			return removeAtKey(state, filter => filter.id === command.id)

		case "CLEAR_FILTER":
			return changeAtKey(
				state,
				filter => filter.id === command.id,
				filter => ({
					...filter,
					filterDefinition: {
						title: "",
						tags: [],
						metadataTypes: new Set<string>()
					}
				})
			)

		case "MOVE_FILTER":
			return moveInArray(state, command.fromIndex, command.toIndex)

		case "ADD_FILTER":

			return [...state, {
				id: crypto.randomUUID(),
				name: command.name,
				filterDefinition: {
					title: command.filterDefinition?.title,
					tags: command.filterDefinition?.tags ?? [],
					metadataTypes: command.filterDefinition?.metadataTypes ?? new Set<string>()
				}
			}]

		case "EDIT_FILTER_NAME":
			return changeAtKey(
				state,
				filter => filter.id === command.id,
				filter => ({
					...filter,
					name: command.name
				})
			)

		case "EDIT_FILTER_DEFINITION_TITLE":
			return changeAtKey(
				state,
				filter => filter.id === command.id,
				filter => ({
					...filter,
					filterDefinition: {
						...filter.filterDefinition,
						title: command.title
					}
				})
			)

		case "EDIT_FILTER_DEFINITION_TAGS":
			return changeAtKey(
				state,
				filter => filter.id === command.id,
				filter => ({
					...filter,
					filterDefinition: {
						...filter.filterDefinition,
						tags: command.tags
					}
				})
			)

		case "EDIT_FILTER_DEFINITION_METADATATYPES":
			return changeAtKey(
				state,
				filter => filter.id === command.id,
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

export const storedFiltersAtom = atomWithReducer<StoredFilter[], StoredFiltersCommand>([], reducer)
