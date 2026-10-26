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
	fileName: string
	engineVersion: string
	language: string[]
	oem: number
	psm: string
	rotateRadians: number
	text: string
	pages: OcrPage[]
}
