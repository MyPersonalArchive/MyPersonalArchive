import { useAtom, useAtomValue } from "jotai"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { useApiClient } from "../Utils/useApiClient"
import { TagsInput } from "../Components/TagsInput"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { MimeTypeConverterArray, useSortableDragDrop } from "../Components/DragDropHelpers"
import { tagsAtom } from "../Utils/Atoms/tagsAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan } from "@fortawesome/free-solid-svg-icons"


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


export const StoredFilterListPage = () => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)
	const apiClient = useApiClient()

	const save = async () => {
		try {
			await apiClient.post("/api/execute/SaveStoredFilters", {
				storedFilters: storedFilters.map((filter: StoredFilter) => ({
					id: filter.id,
					name: filter.name,
					filterDefinition: {
						title: filter.filterDefinition.title,
						tags: filter.filterDefinition.tags,
						metadataTypes: Array.from(filter.filterDefinition.metadataTypes)
					}
				}))
			})
		} catch (error) {
			console.error("Failed to save filters:", error)
		}
	}

	return (
		<>
			<h1 className="heading-1">
				Filters
			</h1>

			{/* <div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={() => dispatch({ action: "ADD_FILTER" })}>Create new filter</button>
			</div> */}

			<div className="overflow-x-auto my-4 gap-4 flex flex-wrap">
				<StoredFilterRows />
				<button className="card btn h-70 w-70" onClick={() => dispatch({ action: "ADD_FILTER", name: "New filter" })}>
					Create new filter
				</button>
			</div>

			<div className="stack-horizontal to-the-right my-4">
			</div>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={save}>Save</button>
			</div>
		</>
	)
}





const StoredFilterRows = () => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)
	const allTags = useAtomValue(tagsAtom)

	const dnd = useSortableDragDrop<StoredFilter, HTMLDivElement>(
		".draghandle",
		mimeTypeConverters,
		storedFilters,
		dispatch
	)

	return (
		<>
			{dnd.rows.map(({ rowType, data: filter }, index) => rowType === "item-row"
				?
				<div key={filter.id}
					className="card w-70 h-70 p-4 flex flex-col gap-2"
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, filter)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) } }
				>
					<span className="draghandle cursor-grab" title="Drag to reorder">☰</span>

					<div>
						<input className="input"
							type="text"
							value={filter.name}
							onChange={e => dispatch({ action: "EDIT_FILTER_NAME", index, name: e.target.value })} />
					</div>
					<div>
						<input className="input"
							type="text"
							value={filter.filterDefinition.title}
							onChange={e => dispatch({ action: "EDIT_FILTER_DEFINITION_TITLE", index, title: e.target.value })} />
					</div>
					<div>
						<TagsInput
							tags={filter.filterDefinition.tags}
							setTags={newTags => dispatch({ action: "EDIT_FILTER_DEFINITION_TAGS", index, tags: newTags })}
							autocompleteList={allTags} />
					</div>
					<div>
						<div className="flex flex-row gap-2">
							{allMetadataTypes.filter(({ path }) => typeof path === "string")
								.map(({ displayName, path }) => (
									<label key={displayName}>
										<input
											type="checkbox"
											id={displayName}
											checked={filter.filterDefinition.metadataTypes.has(path as string)}
											onChange={() => {
												if (filter.filterDefinition.metadataTypes.has(path as string))
													filter.filterDefinition.metadataTypes.delete(path as string)

												else
													filter.filterDefinition.metadataTypes.add(path as string)

												dispatch({ action: "EDIT_FILTER_DEFINITION_METADATATYPES", index, metadataTypes: new Set(filter.filterDefinition.metadataTypes) })
											} } />
										{displayName}
									</label>
								))}
						</div>
					</div>
					<div>
						<button style={{ marginLeft: "10px" }} className=" text-red-500 cursor-pointer" onClick={() => dispatch({ action: "REMOVE_FILTER", index })}>
							<FontAwesomeIcon icon={faTrashCan} size="1x" />
						</button>
					</div>
				</div>
				:
				// row.rowType === "drop-row"
				<div key={filter.id}
					className="card w-70 h-70 striped-background"
					onDragEnd={dnd.dragEnd}
					onDragOver={e => e.preventDefault()}
					onDrop={dnd.handleDrop(index)}
					ref={elmnt => { dnd.setElementRef(elmnt, index) } }
				>

				</div>
			)}
		</>
	)
}