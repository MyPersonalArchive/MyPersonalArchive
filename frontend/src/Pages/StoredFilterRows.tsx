import { useAtom } from "jotai"
import { MimeTypeConverterArray, useSortableDragDrop } from "../Components/DragDropHelpers"
import { tagsAtom } from "../Utils/Atoms/tagsAtom"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { insertAtIndex, removeAtIndex } from "../Utils/array-helpers"
import { Fragment } from "react/jsx-runtime"

type Row<T> = {
	rowType: "item-row" | "drop-row"
	data: T
	key: React.Key
}

export const StoredFilterRows = () => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)

	const mimeTypeConverters: MimeTypeConverterArray<StoredFilter, number> = [
		{
			mimeType: "application/stored-filter+index+json",
			convertDragDataToPayload: (_, index) => ({ index }),
			convertDropPayloadToAction: (fromIndex, toIndex, _) => ({ action: "MOVE_FILTER", fromIndex, toIndex })
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
		dispatch
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
								<input className="input"
									type="text"
									value={filter.name}
									onChange={e => dispatch({ action: "EDIT_FILTER_NAME", index, name: e.target.value })}
								/>
							</td>
							<td>
								<input className="input"
									type="text"
									value={filter.filterDefinition.title}
									onChange={e => dispatch({ action: "EDIT_FILTER_DEFINITION_TITLE", index, title: e.target.value })}
								/>
							</td>
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
