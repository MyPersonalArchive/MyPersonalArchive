import { useAtomValue } from "jotai"
import { StoredFilter, storedFiltersAtom, tagsAtom } from "../Utils/Atoms"
import { TagsInput } from "../Components/TagsInput"
import { useEffect, useState } from "react"
import { DialogContent, DialogFooter, DialogHeader, ModalDialog } from "../Components/ModelDialog"
import { useApiClient } from "../Utils/useApiClient"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { Link } from "react-router-dom"
import { faPlus, faSquare, faSquarePlus } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"


export const StoredFilterListPage = () => {
	const [filter, setFilter] = useState<StoredFilter | undefined>(undefined)
	// const [mode, setMode] = useState<Mode>("create")
	// const [openNewFilterDialog, setOpenNewFilterDialog] = useState(false)
	// const [openDeleteFilterConfirmationDialog, setOpenDeleteFilterConfirmationDialog] = useState(false)

	const storedFilters = useAtomValue(storedFiltersAtom)

	// const apiClient = useApiClient()

	// const save = (filter: StoredFilter) => {
	// 	// console.log("*** tags", filter.tags)
	// 	if (mode === "create") {
	// 		apiClient.post("/api/StoredFilter/create", {
	// 			name: filter.name,
	// 			title: filter.filterDefinition.title,
	// 			tags: filter.filterDefinition.tags.map(tag => tag.trim()),
	// 			metadataTypes: filter.filterDefinition.metadataTypes
	// 		})
	// 	}
	// 	else if (mode == "edit") {
	// 		apiClient.put("/api/StoredFilter/update", {
	// 			id: filter.id,
	// 			name: filter.name,
	// 			title: filter.filterDefinition.title,
	// 			tags: filter.filterDefinition.tags.map(tag => tag.trim()),
	// 			metadataTypes: filter.filterDefinition.metadataTypes
	// 		})
	// 	}
	// }

	// const deleteFilter = (filter?: StoredFilter) => {
	// 	if (!filter) return

	// 	apiClient.delete("/api/StoredFilter/delete", { id: filter.id })
	// }



	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="heading-1">
				Filters
			</h1>


			<div className="flex gap-4 flex-wrap my-4">
				{
					storedFilters?.map(filter => (
						<article key={filter.id} className="border border-gray-200 rounded-sm w-73 h-73 flex flex-col overflow-hidden">
							<h3 className="bg-gray-200 p-4 font-semibold text-lg mb-2">
								{filter.name}
							</h3>
							<div className="text-sm space-y-2 flex-1 overflow-auto px-4 py-2">
								<div>
									<span className="font-medium">Title: </span>
									<span className="text-gray-700">{filter.filterDefinition.title}</span>
								</div>
								<div>
									<span className="font-medium">Metadata: </span>
									{filter.filterDefinition.metadataTypes.map(type => (
										<span key={type} className="tag text-xs">{type}</span>
									))}
								</div>
								<div>
									<span className="font-medium">Tags: </span>
									{filter.filterDefinition.tags.map(tag => (
										<span key={tag} className="tag text-xs">{tag}</span>
									))}
								</div>
							</div>
						</article>
					))
				}
				<button className="bg-gray-200 rounded-sm w-73 h-73 flex flex-col justify-center items-center gap-2 cursor-pointer hover:bg-gray-300 transition-colors">
					<FontAwesomeIcon icon={faPlus} className="text-6xl text-gray-600" />
					<span className="text-sm font-medium text-gray-700">Create a new filter</span>
				</button>
			</div>


			<div>
				<button className="btn">
					New filter
				</button>
			</div>

			<div className="overflow-x-auto my-4">
				<table className="w-full table with-column-seperators">
					<thead>
						<tr>
							<th>Name</th>
							<th>Filter by title</th>
							<th>Filter by tags</th>
							<th>Filter by metadata</th>
						</tr>
					</thead>
					<tbody>
						{
							storedFilters?.map(item => <Row key={item.id} filter={item} />)
						}
						{
							storedFilters && storedFilters.length === 0 && (
								<tr>
									<td colSpan={4} className="text-center italic text-gray-500 py-4">
										No filters
									</td>
								</tr>
							)
						}
					</tbody>
				</table>
			</div>

			<div>
				<button className="btn">
					New filter
				</button>
			</div>

		</div>
	)
}

//TODO: Make filter list a set of cards instead of a table? 3-4 cards in a row, each card showing the filter name and criteria, with edit/delete buttons.
//TODO: Inline editing of filter name and criteria? (Inside the card)
//TODO: Drag and drop to reorder filters?
//TODO: A blank card at the end to create a new filter? (Contains a big plus sign)


type RowProps = {
	filter: StoredFilter,
}

const Row = ({ filter }: RowProps) => {
	return (
		<tr>
			<td>
				<Link to={`/filter/edit/${filter.id}`} className="text-blue-600 hover:underline">{filter.name}</Link>
			</td>
			<td>
				{filter.filterDefinition.title}
			</td>
			<td>
				{
					filter.filterDefinition.tags.map((tag) => (
						<span key={tag} className="tag">{tag}</span>
					))
				}
			</td>
			<td>
				{
					filter.filterDefinition.metadataTypes.map((metadataType) => (
						<span key={metadataType} className="tag">{metadataType}</span>
					))
				}
			</td>
		</tr>
	)
}

// type Mode = "create" | "edit";

// type NewFilterDialogProps = {
// 	open: boolean
// 	setOpen: (open: boolean) => void
// 	onSave: (filter: StoredFilter) => void
// 	mode?: Mode
// 	initialValues?: Partial<StoredFilter>
// }


// const NewFilterDialog = ({
// 	open,
// 	setOpen,
// 	onSave,
// 	mode = "create",
// 	initialValues = {}
// }: NewFilterDialogProps) => {
// 	const [name, setName] = useState(initialValues.name ?? "")
// 	const [title, setTitle] = useState(initialValues.filterDefinition?.title ?? "")
// 	const [tags, setTags] = useState<string[]>(initialValues.filterDefinition?.tags ?? [])
// 	const [metadataTypes, setMetadataTypes] = useState<string[]>(initialValues.filterDefinition?.metadataTypes ?? [])
// 	const allTags = useAtomValue(tagsAtom)

// 	useEffect(() => {
// 		if (open) {
// 			setName(initialValues.name ?? "")
// 			setTitle(initialValues.filterDefinition?.title ?? "")
// 			setTags(initialValues.filterDefinition?.tags ?? [])
// 			setMetadataTypes(initialValues.filterDefinition?.metadataTypes ?? [])
// 		}
// 	}, [open])

// 	if (!open) return null

// 	return (
// 		<ModalDialog onClose={() => setOpen(false)}>
// 			<DialogHeader>
// 				<div className="dialog-header">{mode === "create" ? "New filter" : "Edit filter"}</div>
// 			</DialogHeader>
// 			<DialogContent>
// 				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
// 					<span>Name of filter</span>
// 					<input
// 						type="text"
// 						className="input"
// 						placeholder="Name"
// 						value={name}
// 						onChange={e => setName(e.target.value)}
// 					/>

// 					<span>Filter by title</span>
// 					<input
// 						type="text"
// 						className="input"
// 						placeholder="Filter title"
// 						value={title}
// 						onChange={e => setTitle(e.target.value)}
// 					/>

// 					<span>Filter by tags</span>
// 					<TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} />

// 					<span>Filter by metadata types</span>
// 					{allMetadataTypes.map(component => (
// 						<div key={component.displayName} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
// 							<span>{component.displayName}</span>
// 							<input
// 								type="checkbox"
// 								checked={metadataTypes.includes(component.displayName)}
// 								onChange={e =>
// 									setMetadataTypes(e.target.checked
// 										? [...metadataTypes, component.displayName]
// 										: metadataTypes.filter(name => name !== component.displayName)
// 									)
// 								}
// 							/>
// 						</div>
// 					))}
// 				</div>
// 			</DialogContent>
// 			<DialogFooter>
// 				<button className="btn" onClick={() => setOpen(false)}>Cancel</button>
// 				<button
// 					className="btn btn-primary"
// 					onClick={() => {
// 						setOpen(false)
// 						onSave({
// 							id: initialValues.id ?? 0,
// 							name,
// 							filterDefinition: {
// 								title,
// 								tags,
// 								metadataTypes
// 							}
// 						})
// 					}}
// 				>
// 					{mode === "create" ? "Save" : "Update"}
// 				</button>
// 			</DialogFooter>
// 		</ModalDialog>
// 	)
// }
