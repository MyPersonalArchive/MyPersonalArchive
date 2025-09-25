import { useReducer } from "react"

type Command<T> =
	| { type: "SELECT_ALL_ITEMS" }
	| { type: "DESELECT_ALL_ITEMS" }
	| { type: "SELECT_ITEM", item: T }
	| { type: "DESELECT_ITEM", item: T }
	| { type: "TOGGLE_ITEM", item: T }
	| { type: "SET_SELECTION", items: Set<T> }

export const selectionReducer = <T,>(allPossibleItems: Set<T>) => (state: Set<T>, action: Command<T>) => {
	switch (action.type) {
		case "SELECT_ALL_ITEMS":
			return new Set(allPossibleItems)

		case "DESELECT_ALL_ITEMS":
			return new Set<T>()

		case "SELECT_ITEM":
			if (allPossibleItems.has(action.item)) {
				return state.union(new Set([action.item]))
			}
			return state // Ignore selection of items not in the set of all possible items

		case "DESELECT_ITEM":
			return state.difference(new Set([action.item]))

		case "TOGGLE_ITEM":
			if (allPossibleItems.has(action.item)) {
				return state.has(action.item)
					? state.difference(new Set([action.item]))
					: state.union(new Set([action.item]))
			}
			return state // Ignore selection of items not in the set of all possible items

		case "SET_SELECTION":
			// It is only possible to select items that are in the set of all possible items. Other items will be ignored.
			return action.items.intersection(allPossibleItems)
	}
}

export class Selection<T> {
	private _selectedItems: Set<T>
	private _dispatch: React.Dispatch<Command<T>>

	constructor(
		public readonly allPossibleItems: Set<T>,
		selectedItems: Set<T> = new Set<T>(),
		dispatch: React.Dispatch<Command<T>>
	) {
		this._selectedItems = selectedItems
		this._dispatch = dispatch
	}

	get selectedItems() {
		return this._selectedItems
	}

	set selectedItems(items: Set<T>) {
		this._dispatch({ type: "SET_SELECTION", items })
	}

	selectAllItems() {
		this._dispatch({ type: "SELECT_ALL_ITEMS" })
	}

	clearSelection() {
		this._dispatch({ type: "DESELECT_ALL_ITEMS" })
	}

	select(item: T) {
		this._dispatch({ type: "SELECT_ITEM", item })
	}

	deselect(item: T) {
		this._dispatch({ type: "DESELECT_ITEM", item })
	}

	toggleSelection(item: T) {
		this._dispatch({ type: "TOGGLE_ITEM", item })
	}

	get areAllItemsSelected() {
		return this.allPossibleItems.size === this._selectedItems.size
	}

	get areAnyItemsSelected() {
		return this._selectedItems.size > 0
	}

	get areNoItemsSelected() {
		return this._selectedItems.size === 0
	}

	get areOnlySomeItemsSelected() {
		return this._selectedItems.size > 0 && this.allPossibleItems.size !== this._selectedItems.size
	}
}

export const useSelection = <T,>(allPossibleItems: Set<T>): Selection<T> => {
	const [selectedItems, dispatch] = useReducer(selectionReducer(allPossibleItems), new Set<T>())

	return new Selection<T>(allPossibleItems, selectedItems, dispatch)
}


type SelectCheckboxProps<T> = {
	selection: Selection<T>
	item: T
}
export const SelectCheckbox = <T,>({ selection, item }: SelectCheckboxProps<T>) => {
	return (
		<input className="input" type="checkbox"
			style={{ alignSelf: "end" }}
			checked={selection.selectedItems.has(item)}
			onChange={() => selection.toggleSelection(item)} />
	)
}
