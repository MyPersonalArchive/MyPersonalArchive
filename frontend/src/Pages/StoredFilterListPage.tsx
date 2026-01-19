import { useAtomValue } from "jotai"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms"
import { useApiClient } from "../Utils/useApiClient"
import { Link, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan } from "@fortawesome/free-solid-svg-icons"


export const StoredFilterListPage = () => {
	const storedFilters = useAtomValue(storedFiltersAtom)
	const navigate = useNavigate()


	const newStoredFilter = () => {
		// Navigate to the new stored filter page
		navigate("/filters/new")
	}

	return (
		<>
			<h1 className="heading-1">
				Filters
			</h1>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newStoredFilter}>Create new filter</button>
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
							storedFilters?.map(item => <Row key={item.id} filter={item} />)
						}
					</tbody>
				</table>
			</div>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newStoredFilter}>Create new filter</button>
			</div>

		</>
	)
}


type RowProps = {
	filter: StoredFilter
}
const Row = ({ filter }: RowProps) => {
	const apiClient = useApiClient()

	const deleteFilter = (filter?: StoredFilter) => {
		if (!filter) return

		if (!window.confirm(`Are you sure you want to delete the filter "${filter.name}"?`)) {
			return
		}

		apiClient.delete("/api/execute/DeleteStoredFilter", { id: filter.id })
	}

	return (
		<tr>
			<td>
				<Link to={`/filters/edit/${filter.id}`} className="link">
					{filter.name}
				</Link>
			</td>
			<td>
				{filter.filterDefinition.title}
			</td>
			<td>
				{
					filter.filterDefinition.tags.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				{
					filter.filterDefinition.metadataTypes.map((tag, ix) => (
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
			</td>
			<td>
				{/* <FontAwesomeIcon icon={faGrip} size="1x" /> */}

				<button style={{ marginLeft: "10px" }} className=" text-red-500 cursor-pointer" onClick={() => deleteFilter(filter)}>
					<FontAwesomeIcon icon={faTrashCan} size="1x" />
				</button>
			</td>
		</tr>
	)
}
