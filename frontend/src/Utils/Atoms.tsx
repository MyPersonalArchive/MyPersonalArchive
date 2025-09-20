import { HubConnection } from "@microsoft/signalr"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type User = {
    username: string
    fullname: string
    availableTenantIds: number[]
}
export const loggedInUserAtom = atom<User>()
export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })

export const accessTokenAtom = atom<string | undefined>(undefined)

export const lastSelectedTenantIdAtom = atomWithStorage<number | null>("lastSelectedTenantId", null, undefined, { getOnInit: false })

export const signalRConnectionAtom = atom<HubConnection | undefined>(undefined)

export const tagsAtom = atom<string[]>([])
export const predefinedSearchesAtom = atom<PredefinedSearch[]>([])

export const unallocatedBlobsAtom = atom<UnallocatedBlob[]>([])
export type UnallocatedBlob = {
    id: number
    fileName: string
    fileSize: number
    pageCount: number
    uploadedAt: Date
    uploadedByUser: string
}

export type PredefinedSearch = {
    id: number
    name: string
    title: string
    metadataTypes: string[]
    tags: string[]
}

