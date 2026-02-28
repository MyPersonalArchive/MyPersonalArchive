import { atom } from "jotai"


export type EmailProvider = {
	provider: string
	displayName: string
	authTypes: string[]
}
export const emailProvidersAtom = atom<EmailProvider[]>([])
