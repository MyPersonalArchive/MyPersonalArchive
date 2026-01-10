import { useAtomValue } from "jotai"
import { StoredFilter, storedFiltersAtom, tagsAtom } from "../Utils/Atoms"
import { TagsInput } from "../Components/TagsInput"
import { useEffect, useState } from "react"
import { DialogContent, DialogFooter, DialogHeader, ModalDialog } from "../Components/ModelDialog"
import { useApiClient } from "../Utils/useApiClient"
import { allMetadataTypes } from "../Components/MetadataTypes"


export const StoredFilterListPage = () => {
	const [filter, setFilter] = useState<StoredFilter | undefined>(undefined)
	const [mode, setMode] = useState<Mode>("create")
	const [openNewFilterDialog, setOpenNewFilterDialog] = useState(false)
	const [openDeleteFilterConfirmationDialog, setOpenDeleteFilterConfirmationDialog] = useState(false)

	const storedFilters = useAtomValue(storedFiltersAtom)

	const apiClient = useApiClient()

	const save = (filter: StoredFilter) => {
		// console.log("*** tags", filter.tags)
		if (mode === "create") {
			apiClient.post("/api/StoredFilter/create", {
				name: filter.name,
				title: filter.title,
				tags: filter.tags.map(tag => tag.trim()),
				metadataTypes: filter.metadataTypes
			})
		}
		else if (mode == "edit") {
			apiClient.put("/api/StoredFilter/update", {
				id: filter.id,
				name: filter.name,
				title: filter.title,
				tags: filter.tags.map(tag => tag.trim()),
				metadataTypes: filter.metadataTypes
			})
		}

	}

	const deleteFilter = (filter?: StoredFilter) => {
		if (!filter) return

		apiClient.delete("/api/StoredFilter/delete", { id: filter.id })
	}



	const DeleteFilterConfirmationDialog = () => {
		if (!openDeleteFilterConfirmationDialog) return null

		return (
			<ModalDialog onClose={() => setOpenDeleteFilterConfirmationDialog(false)}>
				<DialogHeader>
					<div className="dialog-header">Delete filter?</div>
				</DialogHeader>
				<DialogContent>
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					</div>
				</DialogContent>
				<DialogFooter>
					<button className="btn" onClick={() => setOpenDeleteFilterConfirmationDialog(false)}>Cancel</button>
					<button className="btn btn-danger" onClick={() => {
						setOpenDeleteFilterConfirmationDialog(false)
						deleteFilter(filter)
					}}>Delete</button>
				</DialogFooter>
			</ModalDialog>
		)
	}


	return (
		<>
			<h1 className="heading-1">
				Filters
			</h1>

			<NewFilterDialog open={openNewFilterDialog} mode={mode} initialValues={filter} setOpen={setOpenNewFilterDialog} onSave={save} />
			<DeleteFilterConfirmationDialog />

			<div>
				<button className="btn" onClick={() => { setFilter(undefined); setMode("create"); setOpenNewFilterDialog(true) }}>New filter</button>
			</div>

			<div className="overflow-x-auto my-4">
				<table className="w-full table with-column-seperators">
					<thead>
						<tr>
							<th>Name</th>
							<th>Filter by title</th>
							<th>Filter by tags</th>
							<th>Filter by metadata</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{
							storedFilters?.map(item => <Row key={item.id}
								filter={item}
								edit={() => { setFilter(item); setMode("edit"); setOpenNewFilterDialog(true) }}
								deleteItem={() => { setFilter(item); setOpenDeleteFilterConfirmationDialog(true) }} />)
						}
					</tbody>
				</table>
			</div>
		</>
	)
}


type RowProps = {
	filter: StoredFilter,
	edit: (filter: StoredFilter) => void,
	deleteItem: (filter: StoredFilter) => void
}

const Row = ({ filter, edit, deleteItem }: RowProps) => {
	return (
		<tr>
			<td>
				{filter.name}
			</td>
			<td>
				{filter.title}
			</td>
			<td>
				{
					filter.tags.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				{
					filter.metadataTypes.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				<button className="btn btn-primary" onClick={() => edit(filter)}>Edit</button>
				<button style={{ marginLeft: "10px" }} className="btn btn-danger" onClick={() => deleteItem(filter)}>Delete</button>
			</td>
		</tr>
	)
}

type Mode = "create" | "edit";

type NewFilterDialogProps = {
	open: boolean
	setOpen: (open: boolean) => void
	onSave: (filter: StoredFilter) => void
	mode?: Mode
	initialValues?: Partial<StoredFilter>
}


const NewFilterDialog = ({
	open,
	setOpen,
	onSave,
	mode = "create",
	initialValues = {}
}: NewFilterDialogProps) => {
	const [name, setName] = useState(initialValues.name ?? "")
	const [title, setTitle] = useState(initialValues.title ?? "")
	const [tags, setTags] = useState<string[]>(initialValues.tags ?? [])
	const [metadataTypes, setMetadataTypes] = useState<string[]>(initialValues.metadataTypes ?? [])
	const allTags = useAtomValue(tagsAtom)

	useEffect(() => {
		if (open) {
			setName(initialValues.name ?? "")
			setTitle(initialValues.title ?? "")
			setTags(initialValues.tags ?? [])
			setMetadataTypes(initialValues.metadataTypes ?? [])
		}
	}, [open])

	if (!open) return null

	return (
		<ModalDialog onClose={() => setOpen(false)}>
			<DialogHeader>
				<div className="dialog-header">{mode === "create" ? "New filter" : "Edit filter"}</div>
			</DialogHeader>
			<DialogContent>
				<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					<span>Name of filter</span>
					<input
						type="text"
						className="input"
						placeholder="Name"
						value={name}
						onChange={e => setName(e.target.value)}
					/>

					<span>Filter by title</span>
					<input
						type="text"
						className="input"
						placeholder="Filter title"
						value={title}
						onChange={e => setTitle(e.target.value)}
					/>

					<span>Filter by tags</span>
					<TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} />

					<span>Filter by metadata types</span>
					{allMetadataTypes.map(component => (
						<div key={component.displayName} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<span>{component.displayName}</span>
							<input
								type="checkbox"
								checked={metadataTypes.includes(component.displayName)}
								onChange={e =>
									setMetadataTypes(e.target.checked
										? [...metadataTypes, component.displayName]
										: metadataTypes.filter(name => name !== component.displayName)
									)
								}
							/>
						</div>
					))}
				</div>
			</DialogContent>
			<DialogFooter>
				<button className="btn" onClick={() => setOpen(false)}>Cancel</button>
				<button
					className="btn btn-primary"
					onClick={() => {
						setOpen(false)
						onSave({
							id: initialValues.id ?? 0,
							name,
							title,
							tags,
							metadataTypes
						})
					}}
				>
					{mode === "create" ? "Save" : "Update"}
				</button>
			</DialogFooter>
		</ModalDialog>
	)
}
