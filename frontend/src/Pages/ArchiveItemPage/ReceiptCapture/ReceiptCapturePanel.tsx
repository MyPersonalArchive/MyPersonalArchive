import { useEffect, useRef, useState } from "react"
import classNames from "classnames"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowRotateRight, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import type { ReceiptCommand, ReceiptLine } from "../../../Components/MetadataTypes/ReceiptMetadataType"
import { hasLowConfidence } from "../../../Utils/OCR/ocrGeometry"
import type { OcrBbox, OcrLine, OcrPageLines, OcrWord } from "../../../Utils/OCR/ocrGeometry"
import type { CaptureField } from "./useReceiptCapture"


export type ReceiptCapturePanelProps = {
	ocrStatus: "idle" | "loading" | "ready" | "error"
	ocrRunning: boolean
	ocrProgress: number
	ocrError?: string
	pageLines?: OcrPageLines
	blobId?: string
	captureField?: CaptureField
	lines: ReceiptLine[]
	currency: string
	selectedWords: OcrWord[]
	dispatch: (command: ReceiptCommand) => void
	onAddLine: (line: OcrLine) => void
	onAddSelection: () => void
	onRunOcr: () => void
	onClearSelection: () => void
	onFocusField: (field: CaptureField) => void
	onClearField: () => void
	onHoverSource: (bbox: OcrBbox | null) => void
	onHoverLine: (lineId: string | null) => void
}


export const ReceiptCapturePanel = ({
	ocrStatus,
	ocrRunning,
	ocrProgress,
	ocrError,
	pageLines,
	blobId,
	captureField,
	lines,
	currency,
	selectedWords,
	dispatch,
	onAddLine,
	onAddSelection,
	onRunOcr,
	onClearSelection,
	onFocusField,
	onClearField,
	onHoverSource,
	onHoverLine
}: ReceiptCapturePanelProps) => {
	const [tab, setTab] = useState<"lines" | "text">("lines")
	const amountRefs = useRef<(HTMLInputElement | null)[]>([])
	const previousLineCount = useRef(lines.length)
	const programmaticFocus = useRef(false)

	// A captured line is added from the image, so focus its amount right away to make a bad
	// parse a single keystroke away.
	useEffect(() => {
		if (lines.length > previousLineCount.current) {
			const amount = amountRefs.current[lines.length - 1]
			// Focus without arming "fill this field from the image": the user did not pick it.
			programmaticFocus.current = true
			amount?.focus()
			programmaticFocus.current = false
			amount?.select()
		}
		previousLineCount.current = lines.length
	}, [lines.length])

	const total = lines.reduce((sum, line) => sum + (Number.parseFloat(line.amount) || 0), 0)
	const selectedText = selectedWords.map(word => word.text).join(" ").trim()
	const progress = Math.round(ocrProgress * 100)
	const canRunOcr = !ocrRunning && ocrStatus !== "loading"

	return (
		<div className="flex flex-col gap-2 flex-1 min-h-0"
			onPointerDown={event => {
				if (!(event.target as HTMLElement).closest("[data-capture-field]")) {
					onClearField()
				}
			}}
		>
			<div role="tablist" className="tabs tabs-border tabs-xs">
				<button type="button" role="tab"
					className={classNames("tab", tab === "lines" && "tab-active")}
					onClick={() => setTab("lines")}
				>
					Lines
				</button>
				<button type="button" role="tab"
					className={classNames("tab", tab === "text" && "tab-active")}
					onClick={() => setTab("text")}
				>
					Detected text
				</button>
			</div>

			{captureField &&
				<div className="rounded border border-primary/40 bg-primary/10 px-2 py-1 flex items-center justify-between gap-2">
					<span className="text-[10px]">
						Click text in the image to fill <strong>{captureField.field === "amount" ? "Amount" : "Description"}</strong> on line {captureField.index + 1}
					</span>
					<button type="button" className="btn btn-xs btn-ghost" title="Stop filling" onClick={onClearField}>&times;</button>
				</div>
			}

			{ocrRunning &&
				<div className="flex flex-col gap-1">
					{/* A local file has no progress reports, so the bar stays indeterminate. */}
					<progress className="progress progress-primary w-full" value={ocrProgress > 0 ? progress : undefined} max={100} />
					<span className="text-xs opacity-70">{ocrProgress > 0 ? `Running OCR… ${progress}%` : "Running OCR…"}</span>
				</div>
			}

			{!ocrRunning && ocrStatus === "loading" &&
				<span className="text-xs opacity-70">Looking for detected text…</span>
			}

			{!ocrRunning && ocrError &&
				<div className="rounded border border-error/40 bg-error/10 p-2 flex flex-col gap-1">
					<span className="text-xs text-error">OCR failed: {ocrError}</span>
					<button type="button" className="btn btn-xs" onClick={onRunOcr}>Try again</button>
				</div>
			}

			{!ocrRunning && !ocrError && ocrStatus === "error" &&
				<div className="rounded border border-error/40 bg-error/10 p-2 flex flex-col gap-1">
					<span className="text-xs text-error">Could not load the detected text.</span>
					<button type="button" className="btn btn-xs" onClick={onRunOcr}>Try again</button>
				</div>
			}

			{!ocrRunning && !ocrError && ocrStatus === "ready" && !pageLines &&
				<div className="rounded border border-warning/40 bg-warning/10 p-2 flex items-center justify-between gap-2">
					<span className="text-xs">No detected text for this file.</span>
					<button type="button" className="btn btn-xs btn-primary" disabled={!canRunOcr} onClick={onRunOcr}>
						Run OCR
					</button>
				</div>
			}

			{tab === "text" && pageLines &&
				<div className="flex flex-col gap-0.5 overflow-auto grow">
					{pageLines.lines.map(line => (
						<button key={line.id}
							type="button"
							className={classNames(
								"text-left text-xs rounded px-2 py-1 hover:bg-base-200",
								hasLowConfidence(line.confidence) && "text-warning"
							)}
							title={`Add "${line.text}" as a receipt line`}
							onMouseEnter={() => onHoverLine(line.id)}
							onMouseLeave={() => onHoverLine(null)}
							onClick={() => onAddLine(line)}
						>
							{line.text || "—"}
						</button>
					))}
				</div>
			}

			{tab === "lines" &&
				<div className="flex flex-col gap-2 overflow-auto grow">
					{selectedText !== "" &&
						<div className="rounded border border-primary/40 bg-primary/10 p-2 flex flex-col gap-1">
							<span className="text-[10px] uppercase tracking-wide opacity-60">Selected text</span>
							<span className="text-xs">{selectedText}</span>
							<div className="flex gap-2">
								<button type="button" className="btn btn-xs btn-primary" onClick={onAddSelection}>Add as line</button>
								<button type="button" className="btn btn-xs btn-ghost" onClick={onClearSelection}>Clear</button>
							</div>
						</div>
					}

					{lines.map((line, index) => {
						const source = line.source
						return (
							<div key={index}
								className="rounded border border-base-300 p-2 flex flex-col gap-1"
								onMouseEnter={() => onHoverSource(source && source.blobId === blobId ? source.bbox : null)}
								onMouseLeave={() => onHoverSource(null)}
							>
								<div className="flex items-center gap-1">
									<input
										className="input input-xs flex-1"
										placeholder="Description"
										data-capture-field="description"
										value={line.description}
										onPointerDown={() => onFocusField({ index, field: "description" })}
										onFocus={() => onFocusField({ index, field: "description" })}
										onChange={event => dispatch({ action: "UPDATE_RECEIPTLINE_DESCRIPTION", index, description: event.target.value })}
									/>
									{source &&
										<span className="text-[10px] opacity-60 shrink-0" title={source.text}>scanned</span>
									}
									<button
										type="button"
										className="text-gray-400 hover:text-red-500 shrink-0"
										title="Remove line"
										onClick={() => dispatch({ action: "REMOVE_RECEIPTLINE", index })}
									>
										<FontAwesomeIcon icon={faTrash} />
									</button>
								</div>
								<div className="flex items-center gap-1">
									<input
										ref={element => { amountRefs.current[index] = element }}
										className="input input-xs w-24"
										placeholder="Amount"
										inputMode="decimal"
										data-capture-field="amount"
										value={line.amount}
										onPointerDown={() => onFocusField({ index, field: "amount" })}
										onFocus={() => {
											if (programmaticFocus.current) {
												return
											}
											onFocusField({ index, field: "amount" })
										}}
										onChange={event => dispatch({ action: "UPDATE_RECEIPTLINE_AMOUNT", index, amount: event.target.value })}
									/>
									<span className="text-xs opacity-60">{currency}</span>
								</div>
							</div>
						)
					})}

					<button type="button" className="btn btn-xs btn-outline"
						onClick={() => dispatch({
							action: "ADD_RECEIPTLINE",
							receiptLine: { description: "", amount: "", warranty: "", dispositionStatus: "" }
						})}
					>
						<FontAwesomeIcon icon={faPlus} />
						Add empty line
					</button>
				</div>
			}

			<div className="flex items-center justify-between gap-2 text-xs opacity-70 border-t border-base-300 pt-1">
				<span>{total !== 0 ? `Total ${total.toFixed(2)} ${currency}` : ""}</span>
				<span className="flex items-center gap-2">
					{pageLines && canRunOcr &&
						<button type="button" className="flex items-center gap-1 hover:opacity-100" title="Run OCR again" onClick={onRunOcr}>
							<FontAwesomeIcon icon={faArrowRotateRight} />
							Re-run OCR
						</button>
					}
					<span>unsaved — ⌘S saves</span>
				</span>
			</div>
		</div>
	)
}
