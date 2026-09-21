import { Link } from "react-router-dom"
import classNames from "classnames"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPaperclip } from "@fortawesome/free-solid-svg-icons"
import { ArchiveItem } from "../../Utils/Atoms/archiveItemsAtom"
import { RoutePaths } from "../../RoutePaths"
import { dateToShortDateDisplay } from "../../Utils/formatUtils"
import { MetadataWithSummaryPill } from "./MetadataWithSummaryPill"
import { allMetadataTypes } from "../../Components/MetadataTypes"


type Props = {
	archiveItem: ArchiveItem
	highlightTags: string[]
	selectedMetadataTypes: string[]
}
export const ArchiveItemRow = ({ archiveItem, highlightTags, selectedMetadataTypes }: Props) => {
	return (
		<Link key={archiveItem.id}
			to={`${RoutePaths.Archive.Edit}/${archiveItem.id}`}
			className="group/archive-item div-row block px-2 py-1 layout-title-date-and-more"
		>
			<span className="title link link-primary link-hover group-hover/archive-item:underline">
				{archiveItem.title}
				{archiveItem.blobIds.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
			</span>

			<span className="date ml-3 mb-2">
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