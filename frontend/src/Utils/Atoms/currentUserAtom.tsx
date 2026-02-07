import { atom } from "jotai"


export type User = {
	username: string
	fullname: string
	availableTenantIds: number[]
}
export const currentUserAtom = atom<User | undefined>(undefined)
