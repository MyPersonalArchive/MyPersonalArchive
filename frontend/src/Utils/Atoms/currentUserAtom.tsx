import { atom } from "jotai"


export type User = {
	username: string
	fullname: string
}
export const currentUserAtom = atom<User | undefined>(undefined)
