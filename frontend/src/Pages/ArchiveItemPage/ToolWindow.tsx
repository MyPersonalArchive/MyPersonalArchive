import { FloatingToolWindow } from "../../Components/FloatingToolWindow"
import { TagsInput } from "../../Components/TagsInput"
import { useEffect, useRef, useState } from "react"
import { useAtomValue } from "jotai"
import classNames from "classnames"
import { tagsAtom } from "../../Utils/Atoms/tagsAtom"
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"
import { ReceiptCapturePanel } from "./ReceiptCapture/ReceiptCapturePanel"
import type { ReceiptCaptureApi, ReceiptCaptureState } from "./ReceiptCapture/useReceiptCapture"


export type ToolWindowTab = "general" | "receipt"

type Props = {
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
	toolWindowPosition: Position
	toolWindowSize: Size
	setToolWindowPosition: (position: Position) => void
	setToolWindowSize: (size: Size) => void
	activeTab: ToolWindowTab
	onSelectTab: (tab: ToolWindowTab) => void
	blobId?: string
	receipt: ReceiptCaptureApi
	capture: ReceiptCaptureState
}
export const ToolWindow = ({ setToolWindowIsOpen, toolWindowPosition, toolWindowSize, setToolWindowPosition, setToolWindowSize, activeTab, onSelectTab, blobId, receipt, capture }: Props) => {
	const [title, setTitle] = useState("")
	const [tags, setTags] = useState<string[]>([])
	const [documentDate, setDocumentDate] = useState("")
	const allTags = useAtomValue(tagsAtom)

	const firstInputRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (activeTab === "general") {
			firstInputRef.current?.focus()
		}
	}, [activeTab])

	return (
		<FloatingToolWindow title="Quick edit archive item"
			className="flex flex-col gap-2 p-2"
			initialPosition={toolWindowPosition}
			initialSize={toolWindowSize}
			onPositionChange={setToolWindowPosition}
			onSizeChange={setToolWindowSize}
			minWidth={300} minHeight={240}
			onClose={() => { setToolWindowIsOpen?.(false) }}
			closeOnEscape={true}
		>
			<div role="tablist" className="tabs tabs-border tabs-sm">
				<button type="button" role="tab"
					className={classNames("tab", activeTab === "general" && "tab-active")}
					onClick={() => onSelectTab("general")}
				>
					General
				</button>
				<button type="button" role="tab"
					className={classNames("tab", activeTab === "receipt" && "tab-active")}
					onClick={() => onSelectTab("receipt")}
				>
					Receipt
				</button>
			</div>

			{activeTab === "general" &&
				<>
					<div className="todo">
						//TODO:<br />
						Show page or tab to edit each metadata type<br />
					</div>

					<div>
						<label htmlFor="title">Title</label>
						<input type="text"
							ref={firstInputRef}
							className="input"
							id="title" placeholder="" autoFocus data-1p-ignore
							value={title}
							onChange={event => setTitle(event.target.value)}
						/>
					</div>

					<span className="join">
						<label className="floating-label">
							<input type="date" className="input"
								value={documentDate ?? ""}
								onChange={e => setDocumentDate(e.target.value)}
							/>
							<span className="label">Document date</span>
						</label>
						<button className="btn" type="button" onClick={() => setDocumentDate("")}>&times;</button>
					</span>

					<TagsInput tags={tags} setTags={setTags} autocompleteList={Array.from(allTags)} />
				</>
			}

			{activeTab === "receipt" &&
				<ReceiptCapturePanel
					ocrStatus={capture.ocrStatus}
					ocrRunning={capture.ocrRunning}
					ocrProgress={capture.ocrProgress}
					ocrError={capture.ocrError}
					pageLines={capture.pageLines}
					blobId={blobId}
					lines={receipt.lines}
					currency={receipt.currency}
					selectedWords={capture.selectedWords}
					dispatch={receipt.dispatch}
					onAddLine={capture.addDetectedLine}
					onAddSelection={capture.addSelection}
					onRunOcr={capture.runOcr}
					onClearSelection={capture.clearSelection}
					onHoverSource={bbox => capture.setHighlighted({ bbox })}
					onHoverLine={lineId => capture.setHighlighted({ lineId })}
				/>
			}

		</FloatingToolWindow>
	)
}
