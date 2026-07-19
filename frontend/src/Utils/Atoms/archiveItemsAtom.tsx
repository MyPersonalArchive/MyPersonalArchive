import { atom } from "jotai"
import { UUID } from "crypto"


export type ArchiveItem = {
	id: UUID
	title: string
	tags: string[]
	documentDate: Date
	createdAt: Date
	metadata: any
	blobIds: UUID[]
}
export const archiveItemsAtom = atom<ArchiveItem[]>([])
