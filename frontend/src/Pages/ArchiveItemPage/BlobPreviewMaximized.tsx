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
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"


export type Props = {
	blob: CommonBlob
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
	removeUnallocatedBlob: (blob: CommonBlob) => void
}
export const BlobPreviewMaximized = ({ blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext, removeUnallocatedBlob }: Props) => {
	const [toolWindowIsOpen, setToolWindowIsOpen] = useAtom(quickEditToolWindowIsOpenAtom)
	const [toolWindowPosition, setToolWindowPosition] = useState<Position>({ x: 100, y: 100 })
	const [toolWindowSize, setToolWindowSize] = useState<Size>({ width: 360, height: 300 })

	return (
		<LightBox key={"id" in blob.identifier ? blob.identifier.id : blob.identifier.fileName} onClose={() => minimize()}>
			<div className="w-full h-full flex justify-center action-bar-host">
				<BaseViewer
					url={"id" in blob.identifier
						? `/api/blob/GetFile?blobId=${blob.identifier.id}&dimension=${DimensionEnum.full}&inline=true`
						: blob.url}
					mimeType={blob.mimeType} />
				{toolWindowIsOpen &&
					<ToolWindow
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
						toolWindowPosition={toolWindowPosition}
						toolWindowSize={toolWindowSize}
						setToolWindowPosition={setToolWindowPosition}
						setToolWindowSize={setToolWindowSize} />}
				<div className="action-bar">
					<button type="button" onClick={e => { setToolWindowIsOpen(!toolWindowIsOpen); e.stopPropagation() }} title="Quick registration tool">
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
					<button type="button" onClick={e => { removeUnallocatedBlob(blob); e.stopPropagation() }} title="Delete">
						<FontAwesomeIcon icon={faTrash} size="1x" />
					</button>
				</div>
			</div>
		</LightBox>

	)
}
