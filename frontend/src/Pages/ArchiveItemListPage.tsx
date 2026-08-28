import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAtomValue } from "jotai"
import { ArchiveItem, archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { RoutePaths } from "../RoutePaths"
import { StoredFilterSelector } from "../Components/Filter/StoredFilterSelector"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip, faMagnifyingGlass, faXmark } from "@fortawesome/free-solid-svg-icons"
import classNames from "classnames"


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
			if (!Object.keys(item.metadata).includes(metadataType.toString())) {
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
			<header className="header">
				<h1>Archive</h1>
			</header>

			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
			</div>

			{/* <Search /> */}
			<StoredFilterSelector />

			<div className="overflow-x-auto my-4">

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
			<div className="stack-horizontal to-the-right my-4">
				<button className="btn" onClick={newArchiveItem}>Create new item</button>
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
			className="block border border-gray-300 border-b-0 last:border-b first:rounded-t-lg last:rounded-b-lg px-2 py-1 bg-gray-50 hover:bg-white"
		>
			<div className="flex justify-between items-center mb-2">
				<span className="link">
					{archiveItem.title}
					{archiveItem.blobIds.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
				</span>
				<span className="flex-1"></span>
				{archiveItem.documentDate ? new Date(archiveItem.documentDate).toLocaleDateString() : ""}
			</div>

			<div className="mb-2">
				{selectedMetadataTypes.includes("receipt") && ReceiptPill(archiveItem)}
				{selectedMetadataTypes.includes("travel-document") && TravelDocPill(archiveItem)}
				{selectedMetadataTypes.includes("email") && EmailPill(archiveItem)}

				{Object.keys(archiveItem.metadata).filter(type => !selectedMetadataTypes.includes(type)).map((type) => (
					<span key={type} className="pill metadatatype">{type}</span>
				))}

				{archiveItem.tags
				// .sort((a, b) => (highlightTags?.includes(a) ? -1 : 0))	// sort highlighted tags to the front
					.map((tag) => (
						<span key={tag} className={classNames("pill tag", { "highlight": highlightTags?.includes(tag) })}>{tag}</span>
					))}
			</div>
		</Link>
	)
}


const ReceiptPill = (archiveItem: any) => {
	return (
		<span className="double-pill bg-blue-200">
			<span>Receipt</span>
			{archiveItem.metadata.receipt.amount && (
				<>
					&nbsp;
					<span className="highlight">
						{archiveItem.metadata.receipt.amount} {archiveItem.metadata.receipt.currency}
					</span>
				</>
			)}
		</span>
	)
}


const TravelDocPill = (archiveItem: any) => {
	const ConcatLegs = (legs: Array<{ flightNumber: string, departureFrom: string, arrivalAt: string }>) => {
		const arrayOfArrays : string[][] = []
		legs.forEach(leg => {
			const currentStage = arrayOfArrays.at(-1) ?? []
			const lastLegArrival = currentStage.at(-1)

			if(lastLegArrival === leg.departureFrom) {
				currentStage.push(leg.arrivalAt)
			} else {
				arrayOfArrays.push([leg.departureFrom, leg.arrivalAt])
			}
		})

		return arrayOfArrays.map(stage => stage.join(" -> ")).join(", ")
	}

	return (
		<span className="double-pill bg-blue-200">
			<span>Travel document</span>
			{archiveItem.metadata["travel-document"].legs?.length > 0 && (
				<span className="highlight">
					{ConcatLegs(archiveItem.metadata["travel-document"].legs)}
				</span>
			)}
		</span>
	)
}


const EmailPill = (archiveItem: any) => {
	return (
		<span className="double-pill bg-blue-200">
			<span>Email</span>
			{archiveItem.metadata.email?.from && (
				<>
					&nbsp;
					<span className="highlight">
						From: {archiveItem.metadata.email.from}
					</span>
				</>
			)}
		</span>
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
			<div className="grouped">
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
