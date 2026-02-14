import { useState } from "react"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"


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

type FindAttachmentRequest = {
	folders?: string[]
	subject?: string
	from?: string
	to?: string
	limit?: number
	since?: string
}


export function useMailProvider() {

	const [emails, setEmails] = useState<Email[]>([])
	const [folders, setFolders] = useState<string[] | undefined>(undefined)
	const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)

	const apiClient = useApiClient()

	const fetchFolders = async (externalAccountId: UUID) => {
		const folders = await apiClient.get<string[]>("/api/query/listFolders", {externalAccountId})
		setFolders(folders)
		setSelectedFolder(folders?.at(0))
	}

	const fetchEmails = async (externalAccountId: UUID, search: FindAttachmentRequest) => {
		const emails = await apiClient.post<Email[]>("/api/query/listEmails", { externalAccountId, criteria:{...search} })
		setEmails((emails ?? []))
	}

	const createArchiveItemFromEmails = async (externalAccountId: UUID, emails: Email[]) => {
		const params = {
			externalAccountId,
			emailFolder: selectedFolder,
			messageIds: emails.map(email => email.uniqueId)
		}
		await apiClient.post<Email[]>("/api/command/createArchiveItemsFromEmails", params)
	}

	const createBlobsFromAttachments = async (externalAccountId: UUID, messageId: string, emailAttachments: EmailAttachment[]) => {
		const params = {
			externalAccountId,
			emailFolder: selectedFolder,
			attachmentReferences: emailAttachments.map(a => ({
				messageId: messageId,
				fileName: a.fileName
			}))
		}
		await apiClient.post<Email[]>("/api/command/createBlobsFromAttachments", params)
	}

	return {
		fetchEmails,
		createArchiveItemFromEmails,
		createBlobsFromAttachments,
		fetchFolders,
		selectedFolder,
		setSelectedFolder,
		emails,
		folders
	}
}
