import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type User = {
    username: string,
    fullname: string,
}
export const loggedInUserAtom = atom<User>()

export const accessTokenAtom = atom<string | undefined>(undefined)
export const selectedTenantIdAtom = atom<number | undefined>(-1)    //TODO:

export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })
