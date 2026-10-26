import type Tesseract from "tesseract.js"


export type OcrProgress = {
	status: string
	progress: number
}

export type OcrPage = {
	pageNumber: number
	width: number
	height: number
	confidence: number
	blocks: Tesseract.Block[]
}

export type OcrUpload = {
	fileName?: string
	engineVersion: string
	language: string[]
	oem: number
	psm: string
	rotateRadians: number
	text: string
	pages: OcrPage[]
}

export type BlobOcr = {
	schemaVersion: string
	blobId: string
	sourceFileName: string
	mimeType: string
	pageCount: number
	engine: string
	engineVersion: string
	oem: number
	psm: string
	rotateRadians: number
	language: string[]
	text: string
	pages: OcrPage[]
	createdAt: string
	createdBy: string
}
