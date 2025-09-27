import { useAtomValue } from "jotai"
import { PredefinedSearch, predefinedSearchesAtom, tagsAtom } from "../Utils/Atoms"
import { TagsInput } from "../Components/TagsInput"
import { useEffect, useState } from "react"
import { DialogContent, DialogFooter, DialogHeader, ModalDialog } from "../Components/ModelDialog"
import { useApiClient } from "../Utils/useApiClient"
import { allMetadataTypes } from "../Components/MetadataTypes"


export const PredefinedSearchEditPage = () => {
	const [search, setSearch] = useState<PredefinedSearch | undefined>(undefined)
	const [mode, setMode] = useState<Mode>("create")
	const [openNewSearchDialog, setOpenNewSearchDialog] = useState(false)
	const [openDeleteSearchDialog, setOpenDeleteSearchDialog] = useState(false)


	const predefinedSearches = useAtomValue(predefinedSearchesAtom)

	const apiClient = useApiClient()

	const save = (search: PredefinedSearch) => {
		if (mode === "create") {
			apiClient.post("/api/predefinedSearch/create", {
				name: search.name,
				title: search.title,
				tags: search.tags.map(tag => tag.trim()),
				metadataTypes: search.metadataTypes
			})
		}
		else if (mode == "edit") {
			apiClient.put("/api/predefinedSearch/update", {
				id: search.id,
				name: search.name,
				title: search.title,
				tags: search.tags.map(tag => tag.trim()),
				metadataTypes: search.metadataTypes
			})
		}

	}

	const deleteSearch = (search?: PredefinedSearch) => {
		if (!search) return

		apiClient.delete("/api/predefinedSearch/delete", { id: search.id })
	}



	const DeleteSearchDialog = () => {
		if (!openDeleteSearchDialog) return null

		return (
			<ModalDialog onClose={() => setOpenDeleteSearchDialog(false)}>
				<DialogHeader>
					<div className="dialog-header">Delete search item?</div>
				</DialogHeader>
				<DialogContent>
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
					</div>
				</DialogContent>
				<DialogFooter>
					<button className="btn" onClick={() => setOpenDeleteSearchDialog(false)}>Cancel</button>
					<button className="btn btn-danger" onClick={() => {
						setOpenDeleteSearchDialog(false)
						deleteSearch(search)
					}}>Delete</button>
				</DialogFooter>
			</ModalDialog>
		)
	}


	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="heading-1">
				Stored filters
			</h1>

			<NewSearchDialog open={openNewSearchDialog} mode={mode} initialValues={search} setOpen={setOpenNewSearchDialog} onSave={save} />
			<DeleteSearchDialog />

			<div>
				<button className="btn" onClick={() => { setSearch(undefined); setMode("create"); setOpenNewSearchDialog(true) }}>New filter</button>
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
							predefinedSearches?.map(item => <Row key={item.id}
								search={item}
								edit={() => { setSearch(item); setMode("edit"); setOpenNewSearchDialog(true) }}
								deleteItem={() => { setSearch(item); setOpenDeleteSearchDialog(true) }} />)
						}
					</tbody>
				</table>
			</div>
		</div>
	)
}

const Row = ({ search, edit, deleteItem }: { search: PredefinedSearch, edit: (search: PredefinedSearch) => void, deleteItem: (search: PredefinedSearch) => void }) => {
	return (
		<tr>
			<td>
				{search.name}
			</td>
			<td>
				{search.title}
			</td>
			<td>
				{
					search.tags.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				{
					search.metadataTypes.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				<button className="btn btn-primary" onClick={() => edit(search)}>Edit</button>
				<button style={{ marginLeft: "10px" }} className="btn btn-danger" onClick={() => deleteItem(search)}>Delete</button>
			</td>
		</tr>
	)
}

type Mode = "create" | "edit";

type NewSearchDialogProps = {
	open: boolean
	setOpen: (open: boolean) => void
	onSave: (search: PredefinedSearch) => void
	mode?: Mode
	initialValues?: Partial<PredefinedSearch>
}


const NewSearchDialog = ({
	open,
	setOpen,
	onSave,
	mode = "create",
	initialValues = {}
}: NewSearchDialogProps) => {
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
						placeholder="Search title"
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
