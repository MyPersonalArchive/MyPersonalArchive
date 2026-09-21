import { Link, useSearchParams } from "react-router-dom"
import { useAtomValue } from "jotai"
import { archiveItemsAtom } from "../../Utils/Atoms/archiveItemsAtom"
import { storedFiltersAtom } from "../../Utils/Atoms/storedFiltersAtom"
import { ArchiveItem } from "../../Utils/Atoms/archiveItemsAtom"
import { RoutePaths } from "../../RoutePaths"
import { StoredFilterSelector } from "../../Components/Filter/StoredFilterSelector"
import { Search } from "./Search"
import { ArchiveItemRow } from "./ArchiveItemRow"


export const ArchiveItemListPage = () => {
	const archiveItems = useAtomValue(archiveItemsAtom)
	const storedFilters = useAtomValue(storedFiltersAtom)
	const [searchParams] = useSearchParams()

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
			if (!Object.keys(item.metadata).includes(metadataType.toString())) {
				return false
			}
		}

		const searchTerm = searchParams.get("find")?.toLowerCase()
		if (searchTerm) {
			if (!item.title.toLowerCase().includes(searchTerm) &&
				!item.tags.some(tag => tag.toLowerCase().includes(searchTerm)) &&
				!Object.values(item.metadata).some(value => value?.toString().toLowerCase().includes(searchTerm))
			) {
				return false
			}
		}

		return true
	}

	const currentFilter = storedFilters.find(f => f.name === searchParams.get("filter"))

	const selectedMetadataTypes = Array.from(currentFilter?.filterDefinition.metadataTypes ?? []).filter(type => typeof type === "string").map(type => type.toString())
	const highlightTags = currentFilter?.filterDefinition.tags ?? []


	return (
		<>
			<div className="mx-2 sm:mx-0 flex flex-wrap items-baseline gap-2">
				<Search />
				<div className="flex-1"></div>
				<Link to={RoutePaths.Archive.New} className="link">Create new item</Link>
			</div>

			<div className="mx-2 sm:mx-0">
				<StoredFilterSelector />
			</div>

			<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
				{archiveItems?.filter(filterFn)
					.toSorted((a, b) => a.title.localeCompare(b.title))
					.map(item =>
						<ArchiveItemRow key={item.id}
							archiveItem={item}
							selectedMetadataTypes={selectedMetadataTypes}
							highlightTags={highlightTags}
						/>
					)
				}
			</div>

			<div className="full-width-non-bordered stack-horizontal to-the-right">
				<Link to={RoutePaths.Archive.New} className="link">Create new item</Link>
			</div>
		</>
	)
}

