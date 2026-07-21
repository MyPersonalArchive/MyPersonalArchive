import { UUID } from "crypto"
import { atom } from "jotai"


export type BlobMetadata = {
	id: UUID
	fileName: string
	fileSize: number
	pageCount: number
	uploadedAt: Date
	uploadedByUser: string
	mimeType?: string
}
export const blobsAtom = atom<BlobMetadata[]>([])
