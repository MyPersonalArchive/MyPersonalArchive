import { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { LightBox } from "../../Components/LightBox"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faToolbox, faArrowLeft, faArrowRight, faDownLeftAndUpRightToCenter } from "@fortawesome/free-solid-svg-icons"
import { BlobMetadata } from "../../Utils/Atoms/blobsAtom"
import { ToolWindow } from "./ToolWindow"
import { ServerViewer } from "../../Components/Viewers/ServerViewer"
import { DimensionEnum } from "../../types/DimensionEnum"
import { quickRegistrationToolWindowIsOpenAtom } from "../../Utils/Atoms"
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"


type Props = {
	blob: BlobMetadata
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
}
export const BlobPreviewMaximized = ({ blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext }: Props) => {
	const [toolWindowIsOpen, setToolWindowIsOpen] = useAtom(quickRegistrationToolWindowIsOpenAtom)
	const [toolWindowPosition, setToolWindowPosition] = useState<Position>({ x: 100, y: 100 })
	const [toolWindowSize, setToolWindowSize] = useState<Size>({ width: 360, height: 250 })

	useEffect(() => {
		const block = (e: Event) => {
			if ((e.target as Element).closest(".photo-zoom")) return
			if (e instanceof WheelEvent && !e.ctrlKey) return
			e.preventDefault()
		}
		document.addEventListener("wheel", block, { passive: false })
		document.addEventListener("gesturestart", block)
		return () => {
			document.removeEventListener("wheel", block)
			document.removeEventListener("gesturestart", block)
		}
	}, [])

	return (
		<LightBox key={blob.id} onClose={() => minimize()} closeOnEscape={!toolWindowIsOpen}>
			<div className="w-full h-full flex justify-center action-bar-host">
				{toolWindowIsOpen &&
					<ToolWindow
						blob={blob}
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
						toolWindowPosition={toolWindowPosition}
						toolWindowSize={toolWindowSize}
						setToolWindowPosition={setToolWindowPosition}
						setToolWindowSize={setToolWindowSize}
					/>
				}
				<TransformWrapper
					minScale={1}
					maxScale={5}
					doubleClick={{ mode: "toggle" }}
					// Plain scroll pans the image; Ctrl/Cmd+scroll or trackpad pinch zooms
					wheel={{ activationKeys: (keys) => keys.includes("Control") || keys.includes("Meta") }}
					trackPadPanning={{ disabled: false }}
				>
					<TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">

						<ServerViewer
							blobId={blob.id}
							mimeType={blob.mimeType}
							dimension={DimensionEnum.full}
						/>
					</TransformComponent>
				</TransformWrapper>
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
				</div>
			</div>
		</LightBox>
	)
}
