import { atom } from "jotai"
import { UUID } from "crypto"


export type ArchiveItem = {
	id: UUID
	title: string
	tags: string[]
	documentDate: Date
	createdAt: Date
	metadataTypes: string[]
	blobs: { id: UUID; }[]
}
export const archiveItemsAtom = atom<ArchiveItem[]>([])
