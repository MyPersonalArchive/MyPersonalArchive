import Tesseract from "tesseract.js"
import tesseractPackage from "tesseract.js/package.json?raw"
import type { OcrProgress } from "./types"


export const OCR_ENGINE_VERSION = (JSON.parse(tesseractPackage) as { version: string }).version
export const OCR_LANGUAGES = ["nor", "eng"]
export const OCR_OEM = Tesseract.OEM.LSTM_ONLY
export const OCR_PSM = Tesseract.PSM.AUTO

export const OCR_MIME_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/tiff",
	"image/bmp"
]


const IDLE_TERMINATE_MS = 60_000

// Phone photos are far larger than tesseract needs, so large images are scaled down before
// recognition. The page keeps the size of the image that was actually recognized.
const MAX_IMAGE_DIMENSION = 2600

type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>

let workerPromise: Promise<OcrWorker> | undefined
let idleTimeout: ReturnType<typeof setTimeout> | undefined
let progressHandler: ((update: OcrProgress) => void) | undefined


const terminateWorker = async () => {
	const pendingWorker = workerPromise
	workerPromise = undefined

	if (!pendingWorker) {
		return
	}

	try {
		await (await pendingWorker).terminate()
	} catch {
		// The worker never started, so there is nothing to terminate.
	}
}


const scheduleTermination = () => {
	if (idleTimeout) {
		clearTimeout(idleTimeout)
	}
	idleTimeout = setTimeout(() => { void terminateWorker() }, IDLE_TERMINATE_MS)
}


const startWorker = () => {
	const baseUrl = import.meta.env.BASE_URL

	workerPromise = Tesseract.createWorker(OCR_LANGUAGES, OCR_OEM, {
		workerPath: `${baseUrl}tesseract/worker.min.js`,
		corePath: `${baseUrl}tesseract/core`,
		langPath: `${baseUrl}tessdata`,
		gzip: true,
		logger: message => progressHandler?.({ status: message.status, progress: message.progress })
	})
		.then(async worker => {
			await worker.setParameters({ preserve_interword_spaces: "1", tessedit_pageseg_mode: OCR_PSM })
			return worker
		})
		.catch(error => {
			workerPromise = undefined
			throw error
		})

	return workerPromise
}


const prepareImage = async (image: Blob) => {
	const bitmap = await createImageBitmap(image)

	try {
		const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height))
		if (scale === 1) {
			return { image, width: bitmap.width, height: bitmap.height }
		}

		const canvas = document.createElement("canvas")
		canvas.width = Math.round(bitmap.width * scale)
		canvas.height = Math.round(bitmap.height * scale)

		const context = canvas.getContext("2d")
		if (!context) {
			throw new Error("Could not create a 2d canvas context")
		}
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

		const scaledImage = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not scale the image")), "image/png")
		})

		return { image: scaledImage, width: canvas.width, height: canvas.height }
	} finally {
		bitmap.close()
	}
}


export const recognizeImage = async (image: Blob, onProgress?: (update: OcrProgress) => void) => {
	progressHandler = onProgress

	if (idleTimeout) {
		clearTimeout(idleTimeout)
		idleTimeout = undefined
	}

	try {
		const preparedImage = await prepareImage(image)
		const worker = await (workerPromise ?? startWorker())
		const { data } = await worker.recognize(preparedImage.image, {}, { blocks: true })

		return {
			text: data.text,
			confidence: data.confidence,
			blocks: data.blocks ?? [],
			oem: OCR_OEM,
			psm: OCR_PSM,
			rotateRadians: data.rotateRadians ?? 0,
			width: preparedImage.width,
			height: preparedImage.height
		}
	} finally {
		progressHandler = undefined
		scheduleTermination()
	}
}
