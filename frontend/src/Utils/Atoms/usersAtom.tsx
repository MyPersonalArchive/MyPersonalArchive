import { atom } from "jotai"


export type User = {
	issuer: string
	subject: string
	fullname: string
	email?: string
	roles: string[]
}
export const usersAtom = atom<User[]>([])
