import { atom } from "jotai"


export type ArchiveItem = {
	id: number
	title: string
	tags: string[]
	blobs: { id: number; }[]
	metadataTypes: string[]
	createdAt: Date
	documentDate: Date
}
export const archiveItemsAtom = atom<ArchiveItem[]>([])
