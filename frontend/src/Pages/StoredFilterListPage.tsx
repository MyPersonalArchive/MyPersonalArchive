import { useAtom, useAtomValue } from "jotai"
import { StoredFilter, storedFiltersAtom, tagsAtom } from "../Utils/Atoms"
import { useApiClient } from "../Utils/useApiClient"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { useState } from "react"
import { TagsInput } from "../Components/TagsInput"


export const StoredFilterListPage = () => {
	const [storedFilters, setStoredFilters] = useAtom(storedFiltersAtom)
	const apiClient = useApiClient()


	const create = async () => {
		const newFilter: StoredFilter = {
			id: crypto.randomUUID(),
			name: "",
			filterDefinition: {
				title: "",
				tags: [],
				metadataTypes: []
			}
		}
		setStoredFilters([...storedFilters, newFilter])
	}

	const change = (oldFilter: StoredFilter, newFilter: StoredFilter) => {
		const updatedFilters = storedFilters.map(f => f.id === oldFilter.id ? newFilter : f)
		setStoredFilters(updatedFilters)
	}

	const remove = (filterToRemove: StoredFilter) => {
		const updatedFilters = storedFilters.filter(f => f.id !== filterToRemove.id)
		setStoredFilters(updatedFilters)
	}

	const save = async () => {
		try {
			await apiClient.post("/api/execute/SaveStoredFilters", {
				storedFilters
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

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={create}>Create new filter</button>
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
							storedFilters?.map(item => <Row key={item.id} filter={item} onChange={change} onRemove={remove}/>)
						}
					</tbody>
				</table>
			</div>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={create}>Create new filter</button>
			</div>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={save}>Save</button>
			</div>

		</>
	)
}


type RowProps = {
	filter: StoredFilter
	onChange: (oldFilter: StoredFilter, newFilter: StoredFilter) => void
	onRemove: (filter: StoredFilter) => void
}
const Row = ({ filter, onChange, onRemove }: RowProps) => {
	const allTags = useAtomValue(tagsAtom)

	const [name, setName] = useState<string>(filter.name)
	const [title, setTitle] = useState<string>(filter.filterDefinition.title || "")
	const [tags, setTags] = useState<string[]>(filter.filterDefinition.tags)
	const [metadataTypes, setMetadataTypes] = useState<string[]>(filter.filterDefinition.metadataTypes)

	const onBlur = () => {
		const updatedFilter: StoredFilter = {
			...filter,
			name,
			filterDefinition: {
				title,
				tags,
				metadataTypes
			}
		}
		onChange(filter, updatedFilter)
	}

	return (
		<tr>
			<td>
				<input className="input"	 type="text" value={name} onChange={e => setName(e.target.value)} onBlur={onBlur} />
			</td>
			<td>
				<span>
					<input className="input" type="text" value={title} onChange={e => setTitle(e.target.value)} onBlur={onBlur} />
				</span>
			</td>
			<td>
				<TagsInput tags={tags} autocompleteList={allTags} setTags={(tags => { setTags(tags); onBlur() })} />
			</td>
			<td>
				{
					filter.filterDefinition.metadataTypes.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				<button style={{ marginLeft: "10px" }} className=" text-red-500 cursor-pointer" onClick={() => onRemove(filter)}>
					<FontAwesomeIcon icon={faTrashCan} size="1x" />
				</button>
			</td>
		</tr>
	)
}
