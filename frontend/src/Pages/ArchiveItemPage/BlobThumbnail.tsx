import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUpRightAndDownLeftFromCenter, faTrash } from "@fortawesome/free-solid-svg-icons"
import { DimensionEnum } from "../../types/DimensionEnum"
import { BaseViewer } from "../../Components/Viewers/BaseViewer"
import { CommonBlob } from "./types"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"
import { useState } from "react"


type Props = {
	blob: CommonBlob
	ocrPending?: boolean
	maximize: (blob: CommonBlob) => void
	onRemoveBlob: (blob: CommonBlob) => void
}
export const BlobThumbnail = ({ blob, ocrPending, maximize, onRemoveBlob }: Props) => {
	const [openDeleteThisDialog, setOpenDeleteThisDialog] = useState(false)

	return (
		<div
			key={"id" in blob.identifier
				? blob.identifier.id
				: blob.identifier.fileName
			}
			className="aspect-square bg-black rounded-lg border border-black w-full flex justify-center items-center relative action-bar-host overflow-hidden"
			onClick={() => maximize(blob)}
		>
			<BaseViewer
				url={"id" in blob.identifier
					? `/api/blob/GetFile?blobId=${blob.identifier.id}&dimension=${DimensionEnum.small}&inline=true`
					: blob.url
				}
				mimeType={blob.mimeType}
				forceImageViewer={true}
			/>
			{ocrPending &&
				<div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] text-white pointer-events-none">
					<span className="loading loading-spinner loading-xs" />
					OCR
				</div>
			}
			<div className="action-bar">
				<button type="button" onClick={e => { maximize(blob); e.stopPropagation() }} title="Expand">
					<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
				</button>
				<button type="button" onClick={e => { setOpenDeleteThisDialog(true); e.stopPropagation() }} title="Delete">
					<FontAwesomeIcon icon={faTrash} size="1x" />
				</button>
			</div>

			<ConfirmationDialog
				open={openDeleteThisDialog}
				prompt="Are you sure you want to remove this upload?"
				onClose={() => setOpenDeleteThisDialog(false)}
				onConfirm={() => { onRemoveBlob(blob); setOpenDeleteThisDialog(false) }}
			/>
		</div>)
}
