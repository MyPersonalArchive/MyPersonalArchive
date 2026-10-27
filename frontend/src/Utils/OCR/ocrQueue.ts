import { OCR_ENGINE_VERSION, OCR_LANGUAGES, OCR_MIME_TYPES, recognizeImage } from "./tesseractWorker"
import type { OcrUpload } from "./types"


// Upper bound for how long a save waits for OCR before uploading without it.
const MAX_OCR_WAIT_MS = 120_000

const jobs = new WeakMap<File, Promise<OcrUpload | undefined>>()
const inFlight = new Set<File>()
const progressListeners = new WeakMap<File, (progress: number) => void>()
const queueListeners = new Set<() => void>()
let queue: Promise<unknown> = Promise.resolve()


const notifyQueueChanged = () => queueListeners.forEach(listener => listener())


const recognize = async (file: File): Promise<OcrUpload | undefined> => {
	try {
		const result = await recognizeImage(file, update => {
			if (update.status === "recognizing text") {
				progressListeners.get(file)?.(update.progress)
			}
		})

		return {
			fileName: file.name,
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
	} catch (error) {
		console.warn(`OCR failed for ${file.name}`, error)
		return undefined
	}
}


/**
 * Queues a file for OCR. Calls are idempotent per file, and files are recognized one at a time
 * so a bulk drop does not start several workers at once.
 */
export const enqueueOcr = (file: File, force: boolean = false) => {
	if (!OCR_MIME_TYPES.includes(file.type) || (!force && jobs.has(file))) {
		return
	}

	const job = queue.then(() => recognize(file))
		.finally(() => {
			inFlight.delete(file)
			notifyQueueChanged()
		})

	jobs.set(file, job)
	inFlight.add(file)
	notifyQueueChanged()
	queue = job
}


/**
 * True while a file is waiting in the queue or being recognized.
 */
export const isOcrPending = (file: File) => inFlight.has(file)


/**
 * Notifies when a file starts or finishes recognition, so views can re-render their pending state.
 * Progress within a file is reported through `subscribeOcrProgress`.
 */
export const subscribeOcrQueue = (listener: () => void) => {
	queueListeners.add(listener)

	return () => { queueListeners.delete(listener) }
}


/**
 * Reports recognition progress (0..1) for a file. Files are recognized one at a time, so a single
 * listener per file is enough.
 */
export const subscribeOcrProgress = (file: File, listener: (progress: number) => void) => {
	progressListeners.set(file, listener)

	return () => { progressListeners.delete(file) }
}


/**
 * Resolves with the OCR result for a file, or `undefined` when the file was not queued,
 * failed, or did not finish within the wait limit.
 */
export const getOcrResult = async (file: File): Promise<OcrUpload | undefined> => {
	const job = jobs.get(file)
	if (!job) {
		return undefined
	}

	const timeout = new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), MAX_OCR_WAIT_MS))
	return Promise.race([job, timeout])
}