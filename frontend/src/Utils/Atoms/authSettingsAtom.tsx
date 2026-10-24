import { atom } from "jotai"

type AuthSettings = {
	oidcAuthUrl: string | undefined
	oidcRegisterUrl: string | undefined
	isManaged: boolean | undefined
}

export const authSettingsAtom = atom<AuthSettings>({ oidcAuthUrl: undefined, oidcRegisterUrl: undefined, isManaged: undefined })
