import { atom } from "jotai"
import { UUID } from "crypto"


export type ArchiveItem = {
	id: number
	title: string
	tags: string[]
	blobs: { id: UUID; }[]
	metadataTypes: string[]
	createdAt: Date
	documentDate: Date
}
export const archiveItemsAtom = atom<ArchiveItem[]>([])
