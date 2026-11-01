import { useEffect, useMemo, useState } from "react"
import { CommonBlob } from "../types"
import { useApiClient } from "../../../Utils/Hooks/useApiClient"
import { invalidateBlobOcr, useBlobOcr } from "../../../Utils/Hooks/useBlobOcr"
import { enqueueOcr, getOcrResult, subscribeOcrProgress } from "../../../Utils/OCR/ocrQueue"
import { OCR_ENGINE_VERSION, OCR_LANGUAGES, recognizeImage } from "../../../Utils/OCR/tesseractWorker"
import { getPageLines, isSameBbox, parseAmount, splitAmount, unionBbox } from "../../../Utils/OCR/ocrGeometry"
import type { OcrBbox, OcrLine, OcrWord } from "../../../Utils/OCR/ocrGeometry"
import type { OcrUpload } from "../../../Utils/OCR/types"
import type { ReceiptCommand, ReceiptLine, ReceiptLineSource } from "../../../Components/MetadataTypes/ReceiptMetadataType"


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

/**
 * A receipt line input that image text is being filled into, so a line whose amount ended up in a
 * separate OCR box can be completed without typing.
 */
export type CaptureField = {
	index: number
	field: "description" | "amount"
}


export const useReceiptCapture = (blob: CommonBlob, receipt: ReceiptCaptureApi, enabled: boolean = true, url?: string) => {
	const apiClient = useApiClient()
	const [selection, setSelection] = useState<{ key?: string, words: OcrWord[] }>({ words: [] })
	const [highlight, setHighlight] = useState<{ key?: string, lineId: string | null, bbox: OcrBbox | null }>({ lineId: null, bbox: null })
	const [refreshKey, setRefreshKey] = useState(0)
	const [ocrJob, setOcrJob] = useState<OcrJob>({ running: false, progress: 0 })
	const [localOcr, setLocalOcr] = useState<{ file: File, upload?: OcrUpload }>()
	const [captureField, setCaptureField] = useState<CaptureField>()

	const blobId = "id" in blob.identifier ? blob.identifier.id : undefined
	const fileName = "fileName" in blob.identifier ? blob.identifier.fileName : undefined
	const blobKey = blobId ?? fileName ?? ""
	const localFile = blob.localFile

	// A file that has not been uploaded yet keeps its OCR in the in-browser queue: the same result
	// that is sent to the server when the item is saved.
	useEffect(() => {
		if (!enabled || !localFile) {
			return
		}

		let isCancelled = false

		enqueueOcr(localFile)
		getOcrResult(localFile).then(upload => {
			if (!isCancelled) {
				setLocalOcr({ file: localFile, upload })
			}
		})

		return () => { isCancelled = true }
	}, [enabled, localFile])

	const { status: serverStatus, ocr: serverOcr } = useBlobOcr(enabled ? blobId : undefined, refreshKey)

	// Recognition of a local file runs in the queue, so its progress arrives through the queue
	// instead of the manual run below.
	useEffect(() => {
		if (!enabled || !localFile) {
			return
		}

		return subscribeOcrProgress(localFile, progress => setOcrJob(current => ({ ...current, progress })))
	}, [enabled, localFile])

	const isLocal = blobId === undefined
	const localUpload = localOcr && localOcr.file === localFile ? localOcr.upload : undefined
	const ocr = isLocal ? localUpload : serverOcr
	const ocrStatus = isLocal
		? (!localFile ? "idle" : localOcr?.file === localFile ? "ready" : "loading")
		: serverStatus
	const ocrRunning = ocrJob.running || (isLocal && ocrStatus === "loading")

	const page = ocr?.pages?.[0]

	const pageLines = useMemo(() => {
		if (!page || Math.abs(ocr?.rotateRadians ?? 0) > 0.001) {
			return undefined
		}

		return getPageLines(page)
	}, [page, ocr?.rotateRadians])

	// Selection and highlight are scoped to a blob, so moving to another image drops them
	// without an effect that would render twice.
	const selectedWords = selection.key === blobKey ? selection.words : []
	const highlightedLineId = highlight.key === blobKey ? highlight.lineId : null
	const highlightedBbox = highlight.key === blobKey ? highlight.bbox : null

	const setHighlighted = (update: { lineId?: string | null, bbox?: OcrBbox | null }) => {
		setHighlight(current => ({
			key: blobKey,
			lineId: update.lineId !== undefined ? update.lineId : (current.key === blobKey ? current.lineId : null),
			bbox: update.bbox !== undefined ? update.bbox : (current.key === blobKey ? current.bbox : null)
		}))
	}

	const clearSelection = () => setSelection({ key: blobKey, words: [] })

	const clearCaptureField = () => setCaptureField(undefined)

	// Fills the focused receipt input with text from the image instead of adding a line. Returns
	// false when no input is waiting for text.
	const insertIntoField = (text: string) => {
		if (!captureField || captureField.index >= receipt.lines.length) {
			return false
		}

		const { index, field } = captureField
		setCaptureField(undefined)

		if (field === "amount") {
			receipt.dispatch({
				action: "UPDATE_RECEIPTLINE_AMOUNT",
				index,
				amount: parseAmount(text) || text.trim()
			})
		} else {
			receipt.dispatch({
				action: "UPDATE_RECEIPTLINE_DESCRIPTION",
				index,
				description: text.trim()
			})
		}

		return true
	}

	const toggleWord = (word: OcrWord) => {
		if (insertIntoField(word.text)) {
			return
		}

		setSelection(current => {
			const words = current.key === blobKey ? current.words : []
			return {
				key: blobKey,
				words: words.some(selected => selected.id === word.id)
					? words.filter(selected => selected.id !== word.id)
					: [...words, word]
			}
		})
	}

	const addCapturedLine = (text: string, bbox: OcrBbox, confidence: number) => {
		const captured = splitAmount(text)

		// A local file has no blob to point at yet, so its captured lines carry the values only.
		const source: ReceiptLineSource | undefined = blobId !== undefined
			? { blobId, pageNumber: 0, bbox, text, confidence }
			: undefined

		const alreadyCaptured = source !== undefined && receipt.lines.some(capturedLine =>
			capturedLine.source?.blobId === source.blobId && isSameBbox(capturedLine.source.bbox, bbox))

		if (!alreadyCaptured) {
			const receiptLine: ReceiptLine = {
				description: captured.text,
				amount: captured.amount,
				warranty: "",
				dispositionStatus: ""
			}

			if (source) {
				receiptLine.source = source
			}

			receipt.ensureSelected()
			receipt.dispatch({ action: "ADD_RECEIPTLINE", receiptLine })
		}

		clearSelection()
	}

	const addDetectedLine = (line: OcrLine) => {
		const captured = splitAmount(line.text)

		if (captureField) {
			insertIntoField(captureField.field === "amount" ? captured.amount || line.text : captured.text)
			return
		}

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
		if (ocrJob.running) {
			return
		}

		if (isLocal) {
			if (!localFile) {
				return
			}

			setOcrJob({ running: true, progress: 0 })
			enqueueOcr(localFile, true)
			const upload = await getOcrResult(localFile)
			setLocalOcr({ file: localFile, upload })
			setOcrJob({ running: false, progress: 0 })
			return
		}

		if (!blobId || !url) {
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
		ocrRunning,
		ocrProgress: ocrJob.progress,
		ocrError: ocrJob.error,
		pageLines,
		captureField,
		setCaptureField,
		clearCaptureField,
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
