import { useAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"
import { Email, EmailAttachment, emailsByExternalAccountAtom, foldersByExternalAccountAtom, selectedFolderByExternalAccountAtom } from "./Atoms"


type FindAttachmentRequest = {
	folders?: string[]
	subject?: string
	from?: string
	to?: string
	limit?: number
	since?: string
}


export function useMailProvider(externalAccountId: UUID) {
	const [foldersByExternalAccount, setFoldersByExternalAccount] = useAtom(foldersByExternalAccountAtom)
	const [emailsByExternalAccount, setEmailsByExternalAccount] = useAtom(emailsByExternalAccountAtom)
	const [selectedFolderByExternalAccount, setSelectedFolderByExternalAccount] = useAtom(selectedFolderByExternalAccountAtom)

	const apiClient = useApiClient()

	const folders = foldersByExternalAccount.get(externalAccountId) ?? []
	const emails = emailsByExternalAccount.get(externalAccountId) ?? []
	const selectedFolder = selectedFolderByExternalAccount.get(externalAccountId)

	const fetchFolders = async () => {
		const folders = await apiClient.get<string[]>("/api/query/listFolders", {externalAccountId})
		setFoldersByExternalAccount(prev => new Map(prev).set(externalAccountId, folders))
		setSelectedFolderByExternalAccount(prev => new Map(prev).set(externalAccountId, folders?.at(0)))
	}

	const fetchEmails = async (search: FindAttachmentRequest) => {
		const emails = await apiClient.post<Email[]>("/api/query/listEmails", { externalAccountId, criteria:{...search} })
		setEmailsByExternalAccount(prev => new Map(prev).set(externalAccountId, emails ?? []))
	}

	const createArchiveItemFromEmails = async (emails: Email[]) => {
		const params = {
			externalAccountId,
			emailFolder: selectedFolder,
			messageIds: emails.map(email => email.uniqueId)
		}
		await apiClient.post<Email[]>("/api/command/createArchiveItemsFromEmails", params)
	}

	const createBlobsFromAttachments = async (messageId: string, emailAttachments: EmailAttachment[]) => {
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
		setSelectedFolder: (folder: string | undefined) => setSelectedFolderByExternalAccount(prev => new Map(prev).set(externalAccountId, folder)),
		emails,
		folders
	}
}
