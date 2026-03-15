import { HubConnection } from "@microsoft/signalr"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })
export const lastRememberMeCheckedAtom = atomWithStorage<boolean>("lastRememberMeChecked", false, undefined, { getOnInit: true })
export const lastSelectedTenantIdAtom = atomWithStorage<number | null>("lastSelectedTenantId", null, undefined, { getOnInit: false })

export const signalRConnectionAtom = atom<HubConnection | undefined>(undefined)


export type Email = {
	uniqueId: string
	subject: string
	body: string
	htmlBody: string
	receivedTime: string
	from: EmailAddress[]
	to: EmailAddress[]
	attachments: EmailAttachment[]
}

export type EmailAddress = {
	name?: string
	emailAddress: string
}

export type EmailAttachment = {
	fileName: string
	contentType: string
}

export const foldersByExternalAccountAtom = atom<Map<string, string[] | undefined>>(new Map())
export const selectedFolderByExternalAccountAtom = atom<Map<string, string | undefined>>(new Map())
export const emailsByExternalAccountAndFolderAtom = atom<Map<string, Map<string, Email[]>>>(new Map())

