import { atom } from "jotai"


export type Blob = {
	id: number
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType?: string
	isAllocated: boolean
}
export const blobsAtom = atom<Blob[]>([])
