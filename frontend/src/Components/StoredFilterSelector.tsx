import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useSearchParams } from "react-router-dom"
import { faGripVertical, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { useAtom, useAtomValue } from "jotai"
import classNames from "classnames"
import { isPreferencesOpenAtom } from "../Utils/Atoms"
import { MimeTypeConverterArray, useSortableDragDrop } from "./DragDropHelpers"


export const StoredFilterSelector = () => {
	const isPreferencesOpen = useAtomValue(isPreferencesOpenAtom)

	return <>
		{isPreferencesOpen
			? <EditableStoredFilters />
			: <ClickableStoredFilters />
		}
	</>
}

const ClickableStoredFilters = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const storedFilters = useAtomValue(storedFiltersAtom)

	const selectFilter = (filter: StoredFilter) => {
		setSearchParams({
			filter: filter.name
		})
	}

	const isChecked = (filter: StoredFilter) => {
		return filter.name === searchParams.get("filter")
	}

	return <div className="stack-horizontal to-the-left">
		{storedFilters?.map((filter) => (
			<button className={classNames("btn btn-wide block font-mono", { "selected": isChecked(filter) })}
				key={filter.id}
				onClick={() => selectFilter(filter)}
			>
				{filter.name}
				<span className="inline-block w-[5.5px]"></span>
			</button>
		))}
	</div>

}


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

const EditableStoredFilters = () => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)

	const dnd = useSortableDragDrop<StoredFilter, HTMLDivElement>(
		".draghandle",
		mimeTypeConverters,
		storedFilters,
		dispatch
	)

	return (
		<div className="stack-horizontal to-the-left my-4">
			{dnd.rows.map(({ rowType, data: filter }, index) => rowType === "item-row"
				?
				<div key={filter.id}
					className="btn btn-wide relative flex items-center cursor-default"
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, filter)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<span className="draghandle cursor-grab text-gray-400 hover:text-gray-600 font-normal absolute left-3 top-1/2 -translate-y-1/2">
						<FontAwesomeIcon icon={faGripVertical} />
					</span>
					<input className="font-mono"
						type="text"
						value={filter.name}
						size={Math.max(3, filter.name.length)}
						onChange={e => dispatch({ action: "EDIT_FILTER_NAME", index, name: e.target.value })} />
					{/* {filter.name} */}
					<button className=" text-red-500 cursor-pointer absolute right-3 top-1/2 -translate-y-1/2" onClick={() => dispatch({ action: "REMOVE_FILTER", index })}>
						<FontAwesomeIcon icon={faTrashCan} size="1x" />
					</button>
				</div>
				:
				// row.rowType === "drop-row"
				<div key={filter.id}
					className="btn striped-background"
					style={{ width: dnd.draggedRect?.width, height: dnd.draggedRect?.height }}
					onDragEnd={dnd.dragEnd}
					onDragOver={e => e.preventDefault()}
					onDrop={dnd.handleDrop(index)}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					&nbsp;
				</div>
			)}
		</div>

	)
}