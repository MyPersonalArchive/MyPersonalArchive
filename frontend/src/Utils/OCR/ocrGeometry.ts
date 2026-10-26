import type Tesseract from "tesseract.js"
import type { OcrPage } from "./types"


export type OcrBbox = {
	x0: number
	y0: number
	x1: number
	y1: number
}

export type OcrWord = {
	id: string
	text: string
	confidence: number
	bbox: OcrBbox
}

export type OcrLine = {
	id: string
	text: string
	confidence: number
	bbox: OcrBbox
	words: OcrWord[]
}

export type OcrPageLines = {
	width: number
	height: number
	lines: OcrLine[]
}


// Matches "2 056,00", "2.056,00", "2056,00" and "42.50". The grouped form is listed
// first so the thousand separators are part of the match.
const AMOUNT_PATTERN = /-?\d{1,3}(?:[ .\u00a0]\d{3})*[.,]\d{2}|-?\d+[.,]\d{2}/g


const toBbox = (bbox: Tesseract.Bbox): OcrBbox => ({
	x0: bbox.x0,
	y0: bbox.y0,
	x1: bbox.x1,
	y1: bbox.y1
})


export const getPageLines = (page: OcrPage): OcrPageLines => {
	const lines: OcrLine[] = []

	for (const [blockIndex, block] of (page.blocks ?? []).entries()) {
		for (const [paragraphIndex, paragraph] of block.paragraphs.entries()) {
			for (const [lineIndex, line] of paragraph.lines.entries()) {
				const id = `${blockIndex}:${paragraphIndex}:${lineIndex}`
				lines.push({
					id,
					text: line.text.trim(),
					confidence: line.confidence,
					bbox: toBbox(line.bbox),
					words: line.words.map((word, wordIndex) => ({
						id: `${id}:${wordIndex}`,
						text: word.text,
						confidence: word.confidence,
						bbox: toBbox(word.bbox)
					}))
				})
			}
		}
	}

	return { width: page.width, height: page.height, lines }
}


const findTrailingAmount = (text: string) => {
	const matches = [...text.matchAll(AMOUNT_PATTERN)]
	const last = matches.at(-1)
	if (!last || last.index === undefined) {
		return undefined
	}

	// Anything with digits after the number is not an amount, e.g. the "02.02" of a date.
	if (/\d/.test(text.slice(last.index + last[0].length))) {
		return undefined
	}

	const amount = Number.parseFloat(last[0].replace(/[ .\u00a0](?=\d{3}\b)/g, "").replace(",", "."))
	return Number.isFinite(amount) ? { index: last.index, length: last[0].length, amount: amount.toFixed(2) } : undefined
}


/**
 * Splits a detected line into the amount it ends with and the description in front of it, so a
 * captured line does not repeat the amount in its description.
 */
export const splitAmount = (text: string): { text: string, amount: string } => {
	const found = findTrailingAmount(text)
	if (!found) {
		return { text, amount: "" }
	}

	const description = `${text.slice(0, found.index)} ${text.slice(found.index + found.length)}`
		.replace(/\s{2,}/g, " ")
		.replace(/[\s,;:-]+$/, "")
		.trim()

	return { text: description === "" ? text : description, amount: found.amount }
}


export const parseAmount = (text: string): string => splitAmount(text).amount


export const hasLowConfidence = (confidence: number) => confidence > 0 && confidence < 60


export const isSameBbox = (left: OcrBbox, right: OcrBbox) =>
	left.x0 === right.x0 && left.y0 === right.y0 && left.x1 === right.x1 && left.y1 === right.y1


export const unionBbox = (words: OcrWord[]): OcrBbox | undefined => {
	if (words.length === 0) {
		return undefined
	}

	return words.reduce<OcrBbox>((union, word) => ({
		x0: Math.min(union.x0, word.bbox.x0),
		y0: Math.min(union.y0, word.bbox.y0),
		x1: Math.max(union.x1, word.bbox.x1),
		y1: Math.max(union.y1, word.bbox.y1)
	}), { ...words[0].bbox })
}
