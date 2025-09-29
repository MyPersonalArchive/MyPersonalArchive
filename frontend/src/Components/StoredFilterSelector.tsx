import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { createQueryString } from "../Utils/createQueryString"
import { faTag } from "@fortawesome/free-solid-svg-icons"
import "../assets/labelList.css"
import { StoredFilter, storedFiltersAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"



export type Orientation = "vertical" | "horizontal";

type StoredFilterSelectorProps = {
	orientation: Orientation
	maxVisible: number
}

export const StoredFilterSelector = ({ orientation, maxVisible }: StoredFilterSelectorProps) => {
	const [maxVisibleItems, setMaxVisibleItems] = useState(maxVisible)
	const navigate = useNavigate()

	const storedFilters = useAtomValue(storedFiltersAtom)

	const selectFilter = (filter: StoredFilter) => {
		navigate({
			search: createQueryString({
				title: filter.title,
				tags: filter.tags.map(tag => tag.trim()),
				metadataTypes: filter.metadataTypes
			}, { skipEmptyStrings: true })
		})
	}

	const displayed = storedFilters.length > maxVisibleItems
		? storedFilters.slice(0, maxVisibleItems)
		: storedFilters

	return (
		<>
			<div
				className={`label-list ${orientation}`}
				role="list"
				aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
			>
				{displayed.map((filter) => (
					<div className="item" key={filter.id}>
						<div
							role="listitem"
							tabIndex={0}
							onClick={() => selectFilter(filter)}
						>
							<FontAwesomeIcon icon={faTag} className="mr-1" color="gray" />
							<span className="text">{filter.name}</span>
						</div>
					</div>

				))}

				{storedFilters.length > maxVisibleItems && (
					<button className="item collapsed"
						onClick={() => setMaxVisibleItems(storedFilters.length)}
						aria-hidden>+{storedFilters.length - maxVisibleItems} more</button>
				)}
			</div>
		</>
	)
}