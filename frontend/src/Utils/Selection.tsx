import { useReducer, useState } from "react"


export type Selection<T> = {
    selectedItems: Set<T>
    readonly areAllItemsSelected: boolean
    readonly areAnyItemsSelected: boolean
    readonly areNoItemsSelected: boolean
    readonly areOnlySomeItemsSelected: boolean
    selectAllItems: () => void
    clearSelection: () => void
    select: (itemToSelect: T) => void
    deselect: (itemToDeselect: T) => void
    toggleSelection: (itemToToggle: T) => void
}

type Command<T> =
    | { type: "SELECT_ALL_ITEMS" }
    | { type: "DESELECT_ALL_ITEMS" }
    | { type: "SELECT_ITEM", item: T }
    | { type: "DESELECT_ITEM", item: T }
    | { type: "TOGGLE_ITEM", item: T }
    | { type: "SET_SELECTION", items: Set<T> }

const selectionReducer = <T,>(allPossibleItems: Set<T>) => (state: Set<T>, action: Command<T>) => {
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

export const useSelection = <T,>(allPossibleItems: Set<T>): Selection<T> => {
    const [selectedItems, dispatch] = useReducer(selectionReducer(allPossibleItems), new Set<T>())

    return {
        get selectedItems() {
            return selectedItems
        },
        set selectedItems(items: Set<T>) {
            dispatch({ type: "SET_SELECTION", items })
        },
        selectAllItems() {
            dispatch({ type: "SELECT_ALL_ITEMS" })
        },
        clearSelection() {
            dispatch({ type: "DESELECT_ALL_ITEMS" })
        },
        select(item: T) {
            dispatch({ type: "SELECT_ITEM", item })
        },
        deselect(item: T) {
            dispatch({ type: "DESELECT_ITEM", item })
        },
        toggleSelection(item: T) {
            dispatch({ type: "TOGGLE_ITEM", item })
        },
        get areAllItemsSelected() {
            return allPossibleItems.size === selectedItems.size
        },
        get areAnyItemsSelected() {
            return selectedItems.size > 0
        },
        get areNoItemsSelected() {
            return selectedItems.size === 0
        },
        get areOnlySomeItemsSelected() {
            return selectedItems.size > 0 && allPossibleItems.size !== selectedItems.size
        }
    }
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
