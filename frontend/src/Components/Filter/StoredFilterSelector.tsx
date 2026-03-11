import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useNavigate, useSearchParams } from "react-router-dom"
import { faGripVertical, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { storedFiltersMimeTypeConverters, StoredFilter, storedFiltersAtom } from "../../Utils/Atoms/storedFiltersAtom"
import { useAtom, useAtomValue } from "jotai"
import classNames from "classnames"
import { isPreferencesOpenAtom } from "../../Utils/Atoms"
import { useDrop, useSortableDragDrop } from "../DragDropHelpers"
import { FormEvent, useEffect, useState } from "react"
import { createQueryString } from "../../Utils/createQueryString"
import { TagsInput } from "../TagsInput"
import { tagsAtom } from "../../Utils/Atoms/tagsAtom"
import { UUID } from "crypto"


export const StoredFilterSelector = () => {
	const isPreferencesOpen = useAtomValue(isPreferencesOpenAtom)

	return isPreferencesOpen
		? <EditableStoredFilters />
		: <ClickableStoredFilters />
}


const ClickableStoredFilters = () => {
	const [searchParams, setSearchParams] = useSearchParams()
	const storedFilters = useAtomValue(storedFiltersAtom)

	const selectFilter = (filter: StoredFilter) => {
		setSearchParams({
			filter: filter.name
		})
	}

	return <div className="stack-horizontal to-the-left">
		{storedFilters?.map((filter) => (
			<button className={classNames("btn btn-wide block font-mono", { "selected": filter.name === searchParams.get("filter") })}
				key={filter.id}
				onClick={() => selectFilter(filter)}
			>
				{filter.name}
				<span className="inline-block w-[5.5px]"></span>
			</button>
		))}
	</div>

}


const EditableStoredFilters = () => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)
	const [searchParams] = useSearchParams()
	// const [selectedFilterIndex, setSelectedFilterIndex] = useState<number>(storedFilters.findIndex(filter => filter.name === searchParams.get("filter")))
	const [selectedFilterId, setSelectedFilterId] = useState<UUID | undefined>(storedFilters.find(filter => filter.name === searchParams.get("filter"))?.id ?? undefined)

	const dnd = useSortableDragDrop<StoredFilter, HTMLDivElement>(
		".draghandle",
		storedFiltersMimeTypeConverters,
		storedFilters,
		dispatch
	)

	const dropToCopy = useDrop<StoredFilter, number>(
		storedFiltersMimeTypeConverters.filter(converter => converter.mimeType === "application/stored-filter-definition+json"),
		dispatch
	)

	return (
		<>
			<div className="stack-horizontal to-the-left my-4">
				{dnd.rows.map(({ rowType, data: filter }, index) => rowType === "item-row"
					?
					<div key={filter.id}
						className={classNames("btn btn-wide relative flex items-center cursor-default", { "selected": filter.id === selectedFilterId })}
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
							onChange={e => dispatch({ action: "EDIT_FILTER_NAME", id: filter.id, name: e.target.value })}
							onFocus={() => setSelectedFilterId(filter.id)}
						/>
						{/* {filter.name} */}
						<button className=" text-red-500 cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
							onClick={() => dispatch({ action: "REMOVE_FILTER", id: filter.id })}
							onFocus={() => setSelectedFilterId(filter.id)}
						>
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
				<button className="btn"
					onDragOver={dropToCopy.dragOver(undefined as unknown as number)}
					onDrop={dropToCopy.handleDrop(undefined as unknown as number)}
					onClick={() => dispatch({ action: "ADD_FILTER", name: "New filter", filterDefinition: { title: "", tags: [], metadataTypes: new Set<string>() } })}
				>
					<FontAwesomeIcon icon={faPlus} />
				</button>
			</div>
			{
				selectedFilterId !== undefined &&
				<FilterForm selectedFilterId={selectedFilterId} />
			}
		</>
	)
}



type FilterFormProps = {
	selectedFilterId: UUID
}
const FilterForm = ({ selectedFilterId }: FilterFormProps) => {
	const [storedFilters, dispatch] = useAtom(storedFiltersAtom)
	const allTags = useAtomValue(tagsAtom)
	const navigate = useNavigate()

	const selectedFilter = storedFilters.find(filter => filter.id === selectedFilterId)

	const search = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		navigate({
			search: createQueryString({
				title: selectedFilter?.filterDefinition.title,
				tags: selectedFilter?.filterDefinition.tags.map(tag => tag.trim())
			}, { skipEmptyStrings: true })
		})
	}

	const reset = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		dispatch({ action: "CLEAR_FILTER", id: selectedFilterId })
	}

	return (
		<form className="stack-horizontal to-the-left my-4"
			onSubmit={search}
			onReset={reset}
		>
			<input className="input"
				type="text"
				placeholder="Search by title"
				value={selectedFilter?.filterDefinition.title ?? ""}
				onChange={event => dispatch({ action: "EDIT_FILTER_DEFINITION_TITLE", id: selectedFilterId, title: event.target.value })}
			/>
			<TagsInput
				placeholder="Search by tags"
				tags={selectedFilter?.filterDefinition.tags ?? []}
				setTags={tags => dispatch({ action: "EDIT_FILTER_DEFINITION_TAGS", id: selectedFilterId, tags })}
				autocompleteList={allTags}
			/>
			<button type="submit" className="btn btn-primary" >
				Search
			</button>
			<button type="reset" className="btn">
				Reset
			</button>
		</form>
	)
}