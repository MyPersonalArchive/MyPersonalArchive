import { useState } from "react"
import { useLocation } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUpRightAndDownLeftFromCenter, faTrash } from "@fortawesome/free-solid-svg-icons"
import { BlobMetadata } from "../../Utils/Atoms/blobsAtom"
import { UUID } from "crypto"
import { SelectCheckbox, type Selection } from "../../Utils/Selection"
import { ServerViewer } from "../../Components/Viewers/ServerViewer"
import { DimensionEnum } from "../../types/DimensionEnum"
import { dateToShortDateDisplay, formatSize } from "../../Utils/formatUtils"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"
import { createPath, generatePath, Link } from "react-router-dom"
import { RoutePaths } from "../../RoutePaths"


type Props = {
	blob: BlobMetadata
	onCreateArchiveItem: (blob: BlobMetadata) => void
	onDeleteBlob: (blobId: UUID) => void
	maximize: (blob: BlobMetadata) => void
	selectionOfBlobs: Selection<UUID>
}
export const BlobRow = ({ blob, onCreateArchiveItem, onDeleteBlob, maximize, selectionOfBlobs }: Props) => {
	const [openDeleteThisDialog, setOpenDeleteThisDialog] = useState(false)
	const location = useLocation()

	return (
		<div className="div-row group/blob-row grid grid-cols-[10rem_1fr] relative has-[.delete-blob:hover]:bg-red-100">

			<div className="bg-black border border-black h-40 flex justify-center items-center action-bar-host"
				onClick={() => maximize(blob)}
			>
				<ServerViewer
					blobId={blob.id}
					mimeType={blob.mimeType}
					dimension={DimensionEnum.thumbnail}
				/>

				<div className="action-bar">
					<button type="button" onClick={e => { maximize(blob); e.stopPropagation() }} title="Expand">
						<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
					</button>
				</div>
			</div>

			<div className="p-2">
				<div className="flex flex-col py-2 px-4">
					<Link className="font-bold link link-primary no-underline hover:underline" to={
						createPath({
							pathname: generatePath(RoutePaths.Blob.View, {blobId: blob.id}),
							search: location.search
						})
					}>{blob.fileName}</Link>
					<div className=" text-sm">{dateToShortDateDisplay(blob.uploadedAt)}</div>
					<div className=" text-sm">{blob.uploadedByUser}</div>
					<div className=" text-sm">{formatSize(blob.fileSize)}</div>
				</div>

				<SelectCheckbox className="absolute right-2 top-2" selection={selectionOfBlobs} item={blob.id} />

				<div className="absolute bottom-2 right-2 space-x-2">
					<button
						className="btn btn-primary"
						disabled={selectionOfBlobs.selectedItems.size > 1}
						onClick={() => onCreateArchiveItem(blob)}
					>
						Create archive item
					</button>
					<button
						className="btn btn-danger btn-square delete-blob group-hover/blob-row:text-red-500 hover:bg-red-100"
						onClick={() => setOpenDeleteThisDialog(true)}
					>
						<FontAwesomeIcon icon={faTrash} size="1x" />
					</button>
				</div>
			</div>

			<ConfirmationDialog
				open={openDeleteThisDialog}
				prompt="Are you sure you want to delete this upload?"
				onClose={() => setOpenDeleteThisDialog(false)}
				onConfirm={() => {
					onDeleteBlob(blob.id)
				}}
			/>

		</div>
	)
}