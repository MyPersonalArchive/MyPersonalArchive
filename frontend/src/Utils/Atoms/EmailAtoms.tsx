import { atom } from "jotai"



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
export const selectedFolderByExternalAccountAtom = atom<Map<string, string | undefined>>(new Map())
export const emailsByExternalAccountAndFolderAtom = atom<Map<string, Map<string, FullEmail[]>>>(new Map())
export const isStreamingEmailsAtom = atom<Map<string, boolean>>(new Map())
