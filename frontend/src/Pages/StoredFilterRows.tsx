import { useAtom } from "jotai"
import { MimeTypeConverterArray, useSortableDragDrop } from "../Components/DragDropHelpers"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms"
import { insertAtIndex, removeAtIndex, moveInArray } from "../Utils/array-helpers"
import { Fragment } from "react/jsx-runtime"

type Row<T> = {
	rowType: "item-row" | "drop-row"
	data: T
	key: React.Key
}

export const StoredFilterRows = () => {
	const [storedFilters, setStoredFilters] = useAtom(storedFiltersAtom)

	const mimeTypeConverters: MimeTypeConverterArray<StoredFilter, number> = [
		{
			mimeType: "application/stored-filter+index+json",
			convertDragDataToPayload: (_, index) => ({ index }),
			convertDropPayloadToAction: (fromStoredFilterIndex, toStoredFilterIndex, _) => (
				() => {
					setStoredFilters(moveInArray(storedFilters, fromStoredFilterIndex, toStoredFilterIndex))
				}
			)
		},
		{
			mimeType: "text",
			convertDragDataToPayload: (storedFilter, _) => `${storedFilter.name}`,
		}
	]
	const dnd = useSortableDragDrop<StoredFilter, number>(
		".draghandle",
		mimeTypeConverters,
		storedFilters.length,
		(action: any) => action() // dispatch
		// (action: any) => { console.log("yay!", action)} // dispatch
	)

	let rows: Row<StoredFilter>[] = storedFilters.map((storedFilter, index) => ({ rowType: "item-row", index, data: storedFilter, key: index }))

	if (dnd.dragStatus.fromIndex !== undefined && dnd.dragStatus.currentIndex !== undefined) {
		const { data } = rows[dnd.dragStatus.fromIndex]
		rows = removeAtIndex(rows, dnd.dragStatus.fromIndex)
		rows = insertAtIndex(rows, dnd.dragStatus.currentIndex, { rowType: "drop-row", data, key: dnd.dragStatus.currentIndex })
	}


	const rowElements = rows.map((row, index) => {
		const filter = row.data!
		return (
			<Fragment key={filter.id}>
				{
					row.rowType === "item-row"
						?
						<tr className="row"
							draggable={true}
							onMouseDown={dnd.mouseDown}
							onMouseUp={dnd.mouseUp}
							onDragStart={dnd.dragStart(index, filter)}
							onDragOver={dnd.dragOver(index)}
							onDragEnd={dnd.dragEnd}
							ref={elmnt => dnd.setElementRef(elmnt, index)}
						>
							<td className="draghandle">☰</td>
							<td>
								{filter.name}
							</td>
							<td>{filter.filterDefinition.title || ""}</td>
							<td>{filter.filterDefinition.tags.join(", ")}</td>
							<td>{filter.filterDefinition.metadataTypes.join(", ")}</td>
							<td className="draghandle">☰</td>
						</tr>
						:
						// row.rowType === "drop-row"
						<tr onDragEnd={dnd.dragEnd}
							onDragOver={e => e.preventDefault()}
							onDrop={dnd.handleDrop(index)}
							ref={elmnt => dnd.setElementRef(elmnt, index)}
							className="drop-area row"
						>
							<td colSpan={6} >
							</td>
						</tr>
				}
			</Fragment >
		)
	})


	return (
		<>
			{rowElements}
		</>
	)
}