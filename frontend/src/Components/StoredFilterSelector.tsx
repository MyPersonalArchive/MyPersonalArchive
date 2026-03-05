import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useSearchParams } from "react-router-dom"
import { faTag, faGripVertical } from "@fortawesome/free-solid-svg-icons"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms/storedFiltersAtom"
import { useAtomValue } from "jotai"
import classNames from "classnames"
import { isPreferencesOpenAtom } from "../Utils/Atoms"


export const StoredFilterSelector = () => {
	const isPreferencesOpen = useAtomValue(isPreferencesOpenAtom)
	
	const [searchParams, setSearchParams] = useSearchParams()
	const storedFilters = useAtomValue(storedFiltersAtom)

	const selectFilter = (filter: StoredFilter) => {
		setSearchParams({
			filter: filter.name
		})
	}

	const isChecked = (filter: StoredFilter) => {
		return filter.name === searchParams.get("filter")
	}

	return (
		<>
			<div className="stack-horizontal to-the-left my-4">
				{storedFilters?.map((filter) => (
					isPreferencesOpen
						? (
							<div key={filter.id} className={classNames("btn", { "selected": isChecked(filter) }, "flex items-center cursor-default")} draggable>
								<span className="cursor-grab mr-2 text-gray-400 hover:text-gray-600 font-normal">
									<FontAwesomeIcon icon={faGripVertical} />
								</span>
								{/* <FontAwesomeIcon icon={faTag} className="mr-1" color="gray" /> */}
								{filter.name}
							</div>
						)
						: (
							<button className={classNames("btn", { "selected": isChecked(filter) })}
								key={filter.id}
								onClick={() => selectFilter(filter)}
							>
								<FontAwesomeIcon icon={faTag} className="mr-1" color="gray" />
								{filter.name}
							</button>
						)
				))}
			</div>
		</>
	)
}