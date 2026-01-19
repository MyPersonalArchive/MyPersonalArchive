import { HubConnection } from "@microsoft/signalr"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type User = {
    username: string
    fullname: string
    availableTenantIds: number[]
}
export const currentUserAtom = atom<User | undefined>(undefined)
// export const isAuthenticatedAtom = atom<boolean>(get => get(currentUserInfoAtom) !== undefined)

export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })
export const lastRememberMeCheckedAtom = atomWithStorage<boolean>("lastRememberMeChecked", false, undefined, { getOnInit: true })
export const lastSelectedTenantIdAtom = atomWithStorage<number | null>("lastSelectedTenantId", null, undefined, { getOnInit: false })

export const signalRConnectionAtom = atom<HubConnection | undefined>(undefined)

export const tagsAtom = atom<string[]>([])

export type ArchiveItem = {
	id: number
	title: string
	tags: string[]
	blobs: {id: number}[]
	metadataTypes: string[]
	createdAt: Date
	documentDate: Date
}
export const archiveItemsAtom = atom<ArchiveItem[]>([])

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

export type StoredFilter = {
    id: number
    name: string
	filterDefinition: {
		title?: string
		tags: string[]
    metadataTypes: string[]
	}
}
export const storedFiltersAtom = atom<StoredFilter[]>([])

export type Account = {
    id: number
    displayName: string
	credentials: string
    type: string
    provider: string
}
export const accountsAtom = atom<Account[]>([])

