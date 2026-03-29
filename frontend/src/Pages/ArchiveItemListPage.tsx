import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAtomValue } from "jotai"
import { ArchiveItem, archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { FileDropZone } from "../Components/FileDropZone"
import { RoutePaths } from "../RoutePaths"
import { StoredFilterSelector } from "../Components/Filter/StoredFilterSelector"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"


export const ArchiveItemListPage = () => {
	const archiveItems = useAtomValue(archiveItemsAtom)
	const storedFilters = useAtomValue(storedFiltersAtom)
	const [searchParams] = useSearchParams()

	const navigate = useNavigate()

	const newArchiveItem = () => {
		navigate(RoutePaths.Archive.New)
	}

	const filterFn = (item: ArchiveItem) => {
		// Either get the filter parameters from the stored filter id, OR get them from the query string
		const storedFilterName = searchParams.get("filter")
		const storedFilter = storedFilterName ? storedFilters.find(f => f.name === storedFilterName) : undefined

		const titleFilter = storedFilter ? storedFilter.filterDefinition.title : searchParams.get("title")
		if (titleFilter && !item.title.toLowerCase().includes(titleFilter.toLowerCase())) {
			return false
		}

		const tagsFilter = storedFilter ? storedFilter.filterDefinition.tags : searchParams.getAll("tags") ?? []
		for (const tag of tagsFilter) {
			if (!item.tags.includes(tag)) {
				return false
			}
		}

		const metadataTypesFilter = storedFilter ? storedFilter.filterDefinition.metadataTypes : searchParams.getAll("metadataTypes") ?? []
		for (const metadataType of metadataTypesFilter) {
			if (!item.metadataTypes.includes(metadataType)) {
				return false
			}
		}

		return true
	}

	return (
		<>
			<h1 className="heading-1">
				Archive
			</h1>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
			</div>

			{/* <Search /> */}
			<StoredFilterSelector />


			<div className="overflow-x-auto my-4">
				<table className="w-full table with-column-seperators">
					<thead>
						<tr>
							<th>Title</th>
							<th>Document date</th>
							<th>Created</th>
						</tr>
					</thead>
					<tbody>
						{
							archiveItems?.filter(filterFn)
								.toSorted((a, b) => a.title.localeCompare(b.title))
								.map(item =>
									<Row key={item.id} archiveItem={item} />
								)
						}
						{
							archiveItems && archiveItems.length === 0 && (
								<tr>
									<td colSpan={4} className="text-center italic text-gray-500 py-4">
										No items found
									</td>
								</tr>
							)
						}
					</tbody>
				</table>
			</div>
			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
			</div>
		</>
	)
}


type RowProps = {
	archiveItem: ArchiveItem
}
const Row = ({ archiveItem }: RowProps) => {
	return (
		<tr>
			<td>
				<Link to={`${RoutePaths.Archive.Edit}/${archiveItem.id}`} className="link">{archiveItem.title}</Link>
				{archiveItem.blobs.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
				<br />
				{
					archiveItem.tags.map((tag) => (
						<span key={tag} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{tag}</span>
					))
				}
				<br />
				{archiveItem.metadataTypes.map((type) => (
					<span key={type} className="inline-block bg-blue-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{type}</span>
				))}
			</td>
			<td>
				{archiveItem.documentDate ? new Date(archiveItem.documentDate).toLocaleDateString() : ""}
			</td>
			<td>
				{archiveItem.createdAt.toLocaleDateString()}
			</td>
		</tr>
	)
}


const Search = () => {
	const [searchParams, setSearchParams] = useSearchParams()

	const search = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
	}

	const reset = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSearchParams({})
	}

	return (
		<form onSubmit={search} onReset={reset} className="stack-horizontal to-the-left my-4">
			<div className="group">
				<input className="input"
					type="text"
					placeholder="Search for anything"
				/>
				<button type="reset" className="btn">
					<FontAwesomeIcon icon={faXmark} className="mr-1" />
				</button>
				<button type="submit" className="btn btn-primary">
					<FontAwesomeIcon icon={faMagnifyingGlass} className="mr-1" />
				</button>
			</div>
		</form>
	)
}
