import { OCR_ENGINE_VERSION, OCR_LANGUAGES, OCR_MIME_TYPES, recognizeImage } from "./tesseractWorker"
import type { OcrUpload } from "./types"


// Upper bound for how long a save waits for OCR before uploading without it.
const MAX_OCR_WAIT_MS = 120_000

const jobs = new WeakMap<File, Promise<OcrUpload | undefined>>()
let queue: Promise<unknown> = Promise.resolve()


const recognize = async (file: File): Promise<OcrUpload | undefined> => {
	try {
		const result = await recognizeImage(file)

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
export const enqueueOcr = (file: File) => {
	if (!OCR_MIME_TYPES.includes(file.type) || jobs.has(file)) {
		return
	}

	const job = queue.then(() => recognize(file))
	jobs.set(file, job)
	queue = job
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
