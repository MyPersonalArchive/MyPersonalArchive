import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useState } from "react"
import { LightBox } from "../../Components/LightBox"
import { BaseViewer } from "../../Components/Viewers/BaseViewer"
import { useAtom } from "jotai"
import { DimensionEnum } from "../../types/DimensionEnum"
import { quickEditToolWindowIsOpenAtom } from "../../Utils/Atoms"
import { faArrowLeft, faArrowRight, faDownLeftAndUpRightToCenter, faToolbox, faTrash } from "@fortawesome/free-solid-svg-icons"
import { CommonBlob } from "./types"
import { ToolWindow } from "./ToolWindow"
import type { ToolWindowTab } from "./ToolWindow"
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"
import { OCR_MIME_TYPES } from "../../Utils/OCR/tesseractWorker"
import { OcrImageView } from "./ReceiptCapture/OcrImageView"
import { useReceiptCapture } from "./ReceiptCapture/useReceiptCapture"
import type { ReceiptCaptureApi } from "./ReceiptCapture/useReceiptCapture"


export type Props = {
	blob: CommonBlob
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
	onRemoveBlob: (blob: CommonBlob) => void
	receipt: ReceiptCaptureApi
}
export const BlobMaximized = ({ blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext, onRemoveBlob, receipt }: Props) => {
	const [toolWindowIsOpen, setToolWindowIsOpen] = useAtom(quickEditToolWindowIsOpenAtom)
	const [toolWindowPosition, setToolWindowPosition] = useState<Position>({ x: 100, y: 100 })
	const [toolWindowSize, setToolWindowSize] = useState<Size>({ width: 400, height: 520 })
	const [selectedTab, setSelectedTab] = useState<ToolWindowTab>()
	const [openDeleteThisDialog, setOpenDeleteThisDialog] = useState(false)

	const blobId = "id" in blob.identifier ? blob.identifier.id : undefined
	const isOcrImage = OCR_MIME_TYPES.includes(blob.mimeType)

	const url = "id" in blob.identifier
		? `/api/blob/GetFile?blobId=${blob.identifier.id}&dimension=${DimensionEnum.full}&inline=true`
		: blob.url

	const capture = useReceiptCapture(blob, receipt, toolWindowIsOpen, url)

	// Until the user picks a tab, follow the content: captured text means the receipt tab is
	// the useful one.
	const activeTab: ToolWindowTab = selectedTab ?? (capture.pageLines ? "receipt" : "general")

	return (
		<LightBox key={"id" in blob.identifier ? blob.identifier.id : blob.identifier.fileName}
			onClose={() => minimize()}
			closeOnEscape={!toolWindowIsOpen}
		>
			<div className="w-full h-full flex justify-center action-bar-host">
				{toolWindowIsOpen && isOcrImage && activeTab === "receipt"
					? <OcrImageView url={url} capture={capture} />
					: <BaseViewer url={url} mimeType={blob.mimeType} />
				}
				{toolWindowIsOpen &&
					<ToolWindow
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
						toolWindowPosition={toolWindowPosition}
						toolWindowSize={toolWindowSize}
						setToolWindowPosition={setToolWindowPosition}
						setToolWindowSize={setToolWindowSize}
						activeTab={activeTab}
						onSelectTab={setSelectedTab}
						blobId={blobId}
						receipt={receipt}
						capture={capture}
					/>}
				<div className="action-bar">
					<button type="button" onClick={e => { setToolWindowIsOpen(!toolWindowIsOpen); e.stopPropagation() }} title="Quick edit archive item">
						<FontAwesomeIcon icon={faToolbox} size="1x" />
					</button>

					<button type="button" disabled={!canMovePrevious} onClick={e => { movePrevious(); e.stopPropagation() }} title="Prev">
						<FontAwesomeIcon icon={faArrowLeft} size="1x" />
					</button>
					<button type="button" disabled={!canMoveNext} onClick={e => { moveNext(); e.stopPropagation() }} title="Next">
						<FontAwesomeIcon icon={faArrowRight} size="1x" />
					</button>
					<button type="button" onClick={e => { minimize(); e.stopPropagation() }} title="Minimize">
						<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
					</button>
					<button type="button" onClick={e => { setOpenDeleteThisDialog(true); e.stopPropagation() }} title="Delete">
						<FontAwesomeIcon icon={faTrash} size="1x" />
					</button>
				</div>
			</div>

			<ConfirmationDialog
				open={openDeleteThisDialog}
				prompt="Are you sure you want to remove this upload?"
				onClose={() => setOpenDeleteThisDialog(false)}
				onConfirm={() => {
					onRemoveBlob(blob)
				}}
			/>

		</LightBox>
	)
}
