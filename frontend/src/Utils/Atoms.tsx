import { HubConnection } from "@microsoft/signalr"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type User = {
    username: string,
    fullname: string,
}
export const loggedInUserAtom = atom<User>()
export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })

export const accessTokenAtom = atom<string | undefined>(undefined)

export const availableTenantsAtom = atom<number[]>([])
export const currentTenantIdAtom = atom<number | undefined>(-1)
export const lastSelectedTenantIdAtom = atomWithStorage<string | null>("lastSelectedTenantId", null, undefined, { getOnInit: true })

export const signalRConnectionAtom = atom<HubConnection | undefined>(undefined)

export const tagsAtom = atom<string[]>([])