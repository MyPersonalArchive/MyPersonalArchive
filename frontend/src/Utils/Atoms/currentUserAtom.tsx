import { atom } from "jotai"


export type User = {
	username: string
	fullname: string
	tenantId: string
	roles: Set<string>
}
export const currentUserAtom = atom<User | undefined>(undefined)

// True once we know whether a user is signed in (either way)
export const authResolvedAtom = atom(false)
