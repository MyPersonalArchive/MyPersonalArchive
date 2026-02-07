import { atom } from "jotai"


export type Account = {
	id: number
	displayName: string
	credentials: string
	type: string
	provider: string
}
export const accountsAtom = atom<Account[]>([])
