import React from "react"
import { Link, useSearchParams } from "react-router-dom"
import classNames from "classnames"
import { useAtomValue } from "jotai"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"
import { ArchiveItem, archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { dateToShortDateDisplay } from "../Utils/formatUtils"
import { RoutePaths } from "../RoutePaths"
import { StoredFilterSelector } from "../Components/Filter/StoredFilterSelector"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { MetadataType } from "../Utils/Metadata/types"


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
						<Row key={item.id}
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



type RowProps = {
	archiveItem: ArchiveItem
	highlightTags: string[]
	selectedMetadataTypes: string[]
}
const Row = ({ archiveItem, highlightTags, selectedMetadataTypes }: RowProps) => {
	return (
		<Link key={archiveItem.id}
			to={`${RoutePaths.Archive.Edit}/${archiveItem.id}`}
			className="group/archive-item div-row layout-title-date-and-more"
		>
			<span className="title link link-primary link-hover group-hover/archive-item:underline">
				{archiveItem.title}
				{archiveItem.blobIds.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
			</span>

			<span className="date float-right ml-3 mb-2">
				{dateToShortDateDisplay(archiveItem.documentDate)}
			</span>

			<div className="more text-xs my-1.5">
				{
					selectedMetadataTypes.map(type =>
						<MetadataWithSummaryPill key={type}
							className="my-1"
							metadataType={allMetadataTypes.find(mt => mt.path === type)!}
							metadata={archiveItem.metadata}
						/>
					)
				}

				{Object.keys(archiveItem.metadata).filter(type => !selectedMetadataTypes.includes(type)).map((type) => (
					<span key={type} className="pill metadatatype my-1">{allMetadataTypes.find(mt => mt.path === type)?.displayName ?? type}</span>
				))}

				{archiveItem.tags
					.map((tag) => (
						<span key={tag} className={classNames("pill tag my-1", { "highlight": highlightTags?.includes(tag) })}>{tag}</span>
					))}
			</div>
		</Link>
	)
}


const MetadataWithSummaryPill = ({ metadataType, metadata, className }: { metadataType: MetadataType, metadata: any, className?: string }) => {
	const summary = metadataType?.summarize(metadata[metadataType.path])
	return (
		<span className={`pill metadatatype ${className ?? ""}`}>
			{metadataType?.displayName ?? metadataType.path}
			{summary &&
				<span className="inner pill highlight">
					{summary}
				</span>
			}
		</span>
	)
}


const Search = () => {
	const [searchTerm, setSearchTerm] = React.useState("")
	const [_, setSearchParams] = useSearchParams()

	const search = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (searchTerm.trim() !== "") {
			setSearchParams(p => {
				const newParams = new URLSearchParams(p)
				newParams.set("find", searchTerm)
				return newParams
			})
		} else {
			setSearchParams({})
		}
	}

	const reset = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setSearchTerm("")
		setSearchParams({})
	}

	return (
		<form onSubmit={search} onReset={reset} className="join">
			<input className="input"
				type="text"
				placeholder="Search for anything"
				value={searchTerm}
				onChange={e => setSearchTerm(e.target.value)}
			/>
			<button type="reset" className="btn">
				<FontAwesomeIcon icon={faXmark} className="mr-1" />
			</button>
			<button type="submit" className="btn btn-primary">
				<FontAwesomeIcon icon={faMagnifyingGlass} className="mr-1" />
			</button>
		</form>
	)
}
