import { atom } from "jotai"

type AuthSettings = {
	oidcAuthUrl: string | undefined
}

export const authSettingsAtom = atom<AuthSettings>({ oidcAuthUrl: undefined })
