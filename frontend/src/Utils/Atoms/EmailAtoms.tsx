import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"




export type EmailSummary = {
	uniqueId: number
	subject: string
	previewText: string
	receivedTime: string
	from: EmailAddress[]
	to: EmailAddress[]
	attachments: EmailAttachment[]
	body?: string
	htmlBody?: string
}


export type EmailContents = {
	body?: string
	htmlBody?: string
}

export type FullEmail = EmailSummary & EmailContents

export type EmailAddress = {
	name?: string
	emailAddress: string
}

export type EmailAttachment = {
	fileName: string
	contentType: string
	partSpecifier: string
}

export const foldersByExternalAccountAtom = atom<Map<string, string[] | undefined>>(new Map())
export const selectedFolderByExternalAccountAtom = atomWithStorage<Record<string, string>>("selectedFolderByExternalAccount", {}, undefined, { getOnInit: true })
export const emailsByExternalAccountAndFolderAtom = atom<Map<string, Map<string, FullEmail[]>>>(new Map())
export const isStreamingEmailsAtom = atom<Map<string, boolean>>(new Map())

