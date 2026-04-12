import { useAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"
import { EmailContents, EmailSummary, EmailAttachment, emailsByExternalAccountAndFolderAtom, foldersByExternalAccountAtom, selectedFolderByExternalAccountAtom, FullEmail } from "../Atoms"


// type FindAttachmentRequest = {
// 	folders?: string[]
// 	subject?: string
// 	from?: string
// 	to?: string
// 	limit?: number
// 	since?: string
// }


export function useMailProvider(externalAccountId: UUID) {
	const [foldersByExternalAccount, setFoldersByExternalAccount] = useAtom(foldersByExternalAccountAtom)
	const [emailsByExternalAccountAndFolder, setEmailsByExternalAccountAndFolder] = useAtom(emailsByExternalAccountAndFolderAtom)
	const [selectedFolderByExternalAccount, setSelectedFolderByExternalAccount] = useAtom(selectedFolderByExternalAccountAtom)

	const apiClient = useApiClient()

	const folders = foldersByExternalAccount.get(externalAccountId) ?? []
	const selectedFolder = selectedFolderByExternalAccount.get(externalAccountId)
	const emails = emailsByExternalAccountAndFolder.get(externalAccountId)?.get(selectedFolder ?? "") ?? []

	const fetchFolders = async () => {
		const folders = await apiClient.get<string[]>("/api/query/listFolders", { externalAccountId })
		setFoldersByExternalAccount(prev => new Map(prev).set(externalAccountId, folders))
		setSelectedFolderByExternalAccount(prev => new Map(prev).set(externalAccountId, folders?.at(0)))
	}

	const fetchEmailSummaries = async () => {
		setEmailsByExternalAccountAndFolder(prev => {
			const current = prev.get(externalAccountId) ?? new Map()
			const updatedCurrent = new Map(current).set(selectedFolder ?? "", [])
			return new Map(prev).set(externalAccountId, updatedCurrent)
		})

		const { promise } = apiClient.getStream<EmailSummary>("/api/Email/GetEmailsStreaming", { externalAccountId, folder: selectedFolder },
			email => {
				setEmailsByExternalAccountAndFolder(prev => {
					const current = prev.get(externalAccountId) ?? new Map<string, FullEmail[]>()
					const folderEmails = current.get(selectedFolder ?? "") ?? []
					const updatedFolderEmails = [...folderEmails, email]
					const updatedCurrent = new Map(current).set(selectedFolder ?? "", updatedFolderEmails)
					return new Map(prev).set(externalAccountId, updatedCurrent)
				})
			}
		)

		await promise
	}

	const fetchEmailContents = async (emailSummary: EmailSummary) => {
		if (emailSummary.body !== undefined || emailSummary.htmlBody !== undefined) {
			return
		}

		//TODO: Ensure that FullEmail is updated, and current mail is re-rendered with new contents.
		const emailContents = await apiClient.get<EmailContents>("/api/query/getEmailContents", { externalAccountId, folder: selectedFolder, messageId: emailSummary.uniqueId })
		setEmailsByExternalAccountAndFolder(prev => {
			const current = prev.get(externalAccountId) ?? new Map<string, FullEmail[]>()
			const folderEmails = current.get(selectedFolder ?? "") ?? []
			const updatedFolderEmails = folderEmails.map(email => email.uniqueId === emailSummary.uniqueId? { ...email, ...emailContents } : email)
			const updatedCurrent = new Map(current).set(selectedFolder ?? "", updatedFolderEmails)
			return new Map(prev).set(externalAccountId, updatedCurrent)
		})
	}

	const createArchiveItemFromEmails = async (emails: EmailSummary[]) => {
		const params = {
			externalAccountId,
			emailFolder: selectedFolder,
			messageIds: emails.map(email => email.uniqueId)
		}
		await apiClient.post("/api/command/createArchiveItemsFromEmails", params)
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
		await apiClient.post("/api/command/createBlobsFromAttachments", params)
	}

	return {
		fetchEmailSummaries,
		fetchEmailContents,
		createArchiveItemFromEmails,
		createBlobsFromAttachments,
		fetchFolders,
		selectedFolder,
		setSelectedFolder: (folder: string | undefined) => setSelectedFolderByExternalAccount(prev => new Map(prev).set(externalAccountId, folder)),
		emails,
		folders
	}
}
