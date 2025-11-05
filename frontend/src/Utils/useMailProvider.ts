import { useState } from "react"
import { useApiClient } from "./useApiClient"
import { ProviderName } from "./useRemoteAuthentication"


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

	const fetchFolders = async (provider: ProviderName) => {
		// if (!isAuthenticated) throw new Error("Not authenticated")

		const folders = await apiClient.get<string[]>(`/api/email/${provider}/list-folders`, null, { credentials: "include" })
		setFolders(folders)
		setSelectedFolder(folders?.at(0))
	}

	const fetchEmails = async (provider: ProviderName, search: FindAttachmentRequest) => {
		// if (!isAuthenticated) throw new Error("Not authenticated")

		const emails = await apiClient.post<Email[]>(`/api/email/${provider}/list`, search, { credentials: "include" })
		setEmails((emails ?? []))
	}

	const createArchiveItemFromEmails = async (provider: ProviderName, emails: Email[]) => {
		const body = {
			folder: selectedFolder,
			messageIds: emails.map(email => email.uniqueId)
		}

		await apiClient.post(`/api/email/${provider}/create-archive-item-from-emails`, body, { credentials: "include" })
	}

	const createBlobsFromAttachments = async (provider: ProviderName, messageId: string, emailAttachments: EmailAttachment[]) => {
		const body = {
			folder: selectedFolder,
			attachments: emailAttachments.map(a => ({
				messageId: messageId,
				fileName: a.fileName
			}))
		}
		await apiClient.post(`/api/email/${provider}/create-blobs-from-attachments`, body, { credentials: "include" })
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
