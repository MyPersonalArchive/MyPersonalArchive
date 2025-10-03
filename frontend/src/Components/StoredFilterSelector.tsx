import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useSearchParams } from "react-router-dom"
import { faTag } from "@fortawesome/free-solid-svg-icons"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import classNames from "classnames"


export const StoredFilterSelector = () => {
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
			<div className="push-left">
				{storedFilters.map((filter) => (
					<button className={classNames("btn" , {"selected": isChecked(filter)})}
						key={filter.id}
						onClick={() => selectFilter(filter)}
					>
						<FontAwesomeIcon icon={faTag} className="mr-1" color="gray" />
						{filter.name}
					</button>
				))}
			</div>
		</>
	)
}