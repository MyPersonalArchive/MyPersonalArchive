import { useMemo, useState } from "react"
import { CommonBlob } from "../types"
import { useApiClient } from "../../../Utils/Hooks/useApiClient"
import { invalidateBlobOcr, useBlobOcr } from "../../../Utils/Hooks/useBlobOcr"
import { OCR_ENGINE_VERSION, OCR_LANGUAGES, recognizeImage } from "../../../Utils/OCR/tesseractWorker"
import { getPageLines, isSameBbox, splitAmount, unionBbox } from "../../../Utils/OCR/ocrGeometry"
import type { OcrBbox, OcrLine, OcrWord } from "../../../Utils/OCR/ocrGeometry"
import type { OcrUpload } from "../../../Utils/OCR/types"
import type { ReceiptCommand, ReceiptLine } from "../../../Components/MetadataTypes/ReceiptMetadataType"


/**
 * The receipt metadata of the archive item being edited. Kept as a narrow contract so the capture
 * feature does not need to know about the metadata reducer plumbing.
 */
export type ReceiptCaptureApi = {
	lines: ReceiptLine[]
	currency: string
	ensureSelected: () => void
	dispatch: (command: ReceiptCommand) => void
}

type OcrJob = {
	running: boolean
	progress: number
	error?: string
}


export const useReceiptCapture = (blob: CommonBlob, receipt: ReceiptCaptureApi, enabled: boolean = true, url?: string) => {
	const apiClient = useApiClient()
	const [selection, setSelection] = useState<{ blobId?: string, words: OcrWord[] }>({ words: [] })
	const [highlight, setHighlight] = useState<{ blobId?: string, lineId: string | null, bbox: OcrBbox | null }>({ lineId: null, bbox: null })
	const [refreshKey, setRefreshKey] = useState(0)
	const [ocrJob, setOcrJob] = useState<OcrJob>({ running: false, progress: 0 })

	const blobId = "id" in blob.identifier ? blob.identifier.id : undefined
	const { status: ocrStatus, ocr } = useBlobOcr(enabled ? blobId : undefined, refreshKey)
	const page = ocr?.pages?.[0]

	const pageLines = useMemo(() => {
		if (!page || Math.abs(ocr?.rotateRadians ?? 0) > 0.001) {
			return undefined
		}

		return getPageLines(page)
	}, [page, ocr?.rotateRadians])

	// Selection and highlight are scoped to a blob, so moving to another image drops them
	// without an effect that would render twice.
	const selectedWords = selection.blobId === blobId ? selection.words : []
	const highlightedLineId = highlight.blobId === blobId ? highlight.lineId : null
	const highlightedBbox = highlight.blobId === blobId ? highlight.bbox : null

	const setHighlighted = (update: { lineId?: string | null, bbox?: OcrBbox | null }) => {
		setHighlight(current => ({
			blobId,
			lineId: update.lineId !== undefined ? update.lineId : (current.blobId === blobId ? current.lineId : null),
			bbox: update.bbox !== undefined ? update.bbox : (current.blobId === blobId ? current.bbox : null)
		}))
	}

	const clearSelection = () => setSelection({ blobId, words: [] })

	const toggleWord = (word: OcrWord) => {
		setSelection(current => {
			const words = current.blobId === blobId ? current.words : []
			return {
				blobId,
				words: words.some(selected => selected.id === word.id)
					? words.filter(selected => selected.id !== word.id)
					: [...words, word]
			}
		})
	}

	const addCapturedLine = (text: string, bbox: OcrBbox, confidence: number) => {
		if (!blobId) {
			return
		}

		const alreadyCaptured = receipt.lines.some(captured =>
			captured.source?.blobId === blobId && isSameBbox(captured.source.bbox, bbox))

		if (!alreadyCaptured) {
			const captured = splitAmount(text)
			receipt.ensureSelected()
			receipt.dispatch({
				action: "ADD_RECEIPTLINE",
				receiptLine: {
					description: captured.text,
					amount: captured.amount,
					warranty: "",
					dispositionStatus: "",
					source: { blobId, pageNumber: 0, bbox, text, confidence }
				}
			})
		}

		clearSelection()
	}

	const addDetectedLine = (line: OcrLine) => {
		addCapturedLine(line.text, line.bbox, line.confidence)
	}

	const addSelection = () => {
		const text = selectedWords.map(word => word.text).join(" ").trim()
		const bbox = unionBbox(selectedWords)

		if (text === "" || !bbox) {
			return
		}

		addCapturedLine(text, bbox, Math.min(...selectedWords.map(word => word.confidence)))
	}

	const runOcr = async () => {
		if (!blobId || !url || ocrJob.running) {
			return
		}

		setOcrJob({ running: true, progress: 0 })

		try {
			const response = await fetch(url, { credentials: "same-origin" })
			if (!response.ok) {
				throw new Error(`Could not load the file (status ${response.status})`)
			}

			const result = await recognizeImage(await response.blob(), update => {
				if (update.status === "recognizing text") {
					setOcrJob(current => ({ ...current, progress: update.progress }))
				}
			})

			const upload: OcrUpload = {
				engineVersion: OCR_ENGINE_VERSION,
				language: OCR_LANGUAGES,
				oem: result.oem,
				psm: result.psm,
				rotateRadians: result.rotateRadians,
				text: result.text,
				pages: [{
					pageNumber: 0,
					width: result.width,
					height: result.height,
					confidence: result.confidence,
					blocks: result.blocks
				}]
			}

			await apiClient.execute("SaveBlobOcr", { id: blobId, ocr: upload })

			invalidateBlobOcr(blobId)
			setRefreshKey(key => key + 1)
			setOcrJob({ running: false, progress: 0 })
		} catch (error) {
			setOcrJob({ running: false, progress: 0, error: error instanceof Error ? error.message : String(error) })
		}
	}

	return {
		ocrStatus,
		ocrRunning: ocrJob.running,
		ocrProgress: ocrJob.progress,
		ocrError: ocrJob.error,
		pageLines,
		selectedWords,
		highlightedLineId,
		highlightedBbox,
		addDetectedLine,
		addSelection,
		runOcr,
		clearSelection,
		toggleWord,
		setHighlighted
	}
}


export type ReceiptCaptureState = ReturnType<typeof useReceiptCapture>
