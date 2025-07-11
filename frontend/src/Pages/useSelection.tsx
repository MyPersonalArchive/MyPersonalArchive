import { useState } from "react";


export type Selection<T> = {
    readonly selectedItems: Set<T>;
    readonly areAllItemsSelected: boolean;
    readonly areAnyItemsSelected: boolean;
    readonly areNoItemsSelected: boolean;
    readonly areOnlySomeItemsSelected: boolean;
    selectAllItems: () => void;
    clearSelection: () => void;
    select: (itemToSelect: T) => void;
    deselect: (itemToDeselect: T) => void;
    toggleSelection: (itemToToggle: T) => void;
};

export const useSelection = <T,>(allPossibleItems: Set<T>): Selection<T> => {
    const [selectedItems, setSelectedItems] = useState<Set<T>>(new Set<T>())

    return {
        get selectedItems() {
            return selectedItems
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
        },
        selectAllItems() {
            setSelectedItems(new Set(allPossibleItems))
        },
        clearSelection() {
            setSelectedItems(new Set())
        },
        select(itemToSelect: T) {
            // It should not be possible to select an item that is not in the set of all possible items
            if (allPossibleItems.has(itemToSelect)) {
                setSelectedItems(set => set.union(new Set([itemToSelect])))
            }
        },
        deselect(itemToDeselect: T) {
            setSelectedItems(set => set.difference(new Set([itemToDeselect])))
        },
        toggleSelection(itemToToggle: T) {
            // It should not be possible to select an item that is not in the set of all possible items
            if (allPossibleItems.has(itemToToggle)) {
                setSelectedItems(set => set.has(itemToToggle)
                    ? set.difference(new Set([itemToToggle]))
                    : set.union(new Set([itemToToggle])))
            }
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
