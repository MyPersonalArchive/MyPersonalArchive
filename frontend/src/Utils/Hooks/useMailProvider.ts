import { useAtom } from "jotai"
import { useRef } from "react"
import { useApiClient } from "./useApiClient"
import { UUID } from "crypto"
import { EmailContents, EmailSummary, EmailAttachment, emailsByExternalAccountAndFolderAtom, foldersByExternalAccountAtom, selectedFolderByExternalAccountAtom, FullEmail, isStreamingEmailsAtom } from "../Atoms/EmailAtoms"



export function useMailProvider(externalAccountId: UUID, initialFolder?: string) {
	const [foldersByExternalAccount, setFoldersByExternalAccount] = useAtom(foldersByExternalAccountAtom)
	const [emailsByExternalAccountAndFolder, setEmailsByExternalAccountAndFolder] = useAtom(emailsByExternalAccountAndFolderAtom)
	const [selectedFolderByExternalAccount, setSelectedFolderByExternalAccount] = useAtom(selectedFolderByExternalAccountAtom)
	const [isStreamingEmailsMap, setIsStreamingEmailsMap] = useAtom(isStreamingEmailsAtom)
	// State updates are batched and invisible to other effects, so track in-flight fetches synchronously here instead
	const foldersBeingFetchedRef = useRef(new Set<string>())

	const apiClient = useApiClient()

	const folders = foldersByExternalAccount.get(externalAccountId)
	const selectedFolder = initialFolder ?? selectedFolderByExternalAccount[externalAccountId] ?? folders?.at(0)
	const emails = emailsByExternalAccountAndFolder.get(externalAccountId)?.get(selectedFolder ?? "")
	const isStreamingEmails = isStreamingEmailsMap.get(externalAccountId) ?? false

	const setSelectedFolder = (folder: string) => {
		setSelectedFolderByExternalAccount(prev => ({ ...prev, [externalAccountId]: folder }))
	}

	const fetchFolders = async () => {
		const folders = await apiClient.query<string[]>("listFolders", { externalAccountId })
		const nextFolder = initialFolder ?? selectedFolderByExternalAccount[externalAccountId] ?? folders?.at(0)
		setFoldersByExternalAccount(prev => new Map(prev).set(externalAccountId, folders))
		if (nextFolder !== undefined) {
			setSelectedFolderByExternalAccount(prev => ({ ...prev, [externalAccountId]: nextFolder }))
		}
		return nextFolder
	}

	const fetchEmailSummaries = async (folder = selectedFolder) => {
		const targetFolder = folder ?? selectedFolder ?? folders?.at(0)
		if (!targetFolder) {
			return
		}

		const inFlightKey = `${externalAccountId}:${targetFolder}`
		if (foldersBeingFetchedRef.current.has(inFlightKey)) {
			return
		}
		foldersBeingFetchedRef.current.add(inFlightKey)

		try {
			setSelectedFolderByExternalAccount(prev => ({ ...prev, [externalAccountId]: targetFolder }))
			setEmailsByExternalAccountAndFolder(prev => {
				const current = prev.get(externalAccountId) ?? new Map<string, FullEmail[]>()
				const updatedCurrent = new Map(current).set(targetFolder, [])
				return new Map(prev).set(externalAccountId, updatedCurrent)
			})
			setIsStreamingEmailsMap(prev => new Map(prev).set(externalAccountId, true))

			const { promise } = apiClient.getStream<EmailSummary>("/api/Email/GetEmailsStreaming", { externalAccountId, folder: targetFolder },
				email => {
					setEmailsByExternalAccountAndFolder(prev => {
						const current = prev.get(externalAccountId) ?? new Map<string, FullEmail[]>()
						const folderEmails = current.get(targetFolder) ?? []
						const updatedFolderEmails = [...folderEmails, email]
						const updatedCurrent = new Map(current).set(targetFolder, updatedFolderEmails)
						return new Map(prev).set(externalAccountId, updatedCurrent)
					})
				}
			)

			await promise
			setIsStreamingEmailsMap(prev => new Map(prev).set(externalAccountId, false))
		} finally {
			foldersBeingFetchedRef.current.delete(inFlightKey)
		}
	}

	const fetchEmailContents = async (emailSummary: EmailSummary) => {
		if (emailSummary.body !== undefined || emailSummary.htmlBody !== undefined) {
			return
		}

		const targetFolder = selectedFolder ?? initialFolder ?? folders?.at(0)
		if (!targetFolder) {
			return
		}

		const emailContents = await apiClient.query<EmailContents>("getEmailContents", { externalAccountId, folder: targetFolder, messageId: emailSummary.uniqueId })
		setEmailsByExternalAccountAndFolder(prev => {
			const current = prev.get(externalAccountId) ?? new Map<string, FullEmail[]>()
			const folderEmails = current.get(targetFolder) ?? []
			const updatedFolderEmails = folderEmails.map(email => email.uniqueId === emailSummary.uniqueId ? { ...email, ...emailContents } : email)
			const updatedCurrent = new Map(current).set(targetFolder, updatedFolderEmails)
			return new Map(prev).set(externalAccountId, updatedCurrent)
		})
	}


	const createArchiveItemFromEmails = async (emails: EmailSummary[]) => {
		const targetFolder = selectedFolder ?? initialFolder ?? folders?.at(0)
		if (!targetFolder || emails.length === 0) {
			return
		}

		const params = {
			externalAccountId,
			emailFolder: targetFolder,
			messageIds: emails.map(email => email.uniqueId)
		}
		await apiClient.execute("CreateArchiveItemsFromEmails", params)
	}

	const createBlobsFromAttachments = async (messageId: number, emailAttachments: EmailAttachment[]) => {
		const targetFolder = selectedFolder ?? initialFolder ?? folders?.at(0)
		if (!targetFolder) {
			return
		}

		const params = {
			externalAccountId,
			emailFolder: targetFolder,
			attachmentReferences: emailAttachments.map(a => ({
				messageId: messageId,
				partSpecifier: a.partSpecifier
			}))
		}
		await apiClient.execute("CreateBlobsFromAttachments", params)
	}

	const ensureMailDataIsLoaded = async () => {
		const currentFolders = foldersByExternalAccount.get(externalAccountId)
		if (currentFolders === undefined) {
			await fetchFolders()
		}

		const effectiveFolder = initialFolder ?? selectedFolderByExternalAccount[externalAccountId] ?? foldersByExternalAccount.get(externalAccountId)?.at(0)
		if (effectiveFolder && !(externalAccountId in selectedFolderByExternalAccount)) {
			setSelectedFolder(effectiveFolder)
		}

		if (effectiveFolder && emailsByExternalAccountAndFolder.get(externalAccountId)?.get(effectiveFolder) === undefined) {
			await fetchEmailSummaries(effectiveFolder)
		}
	}

	return {
		fetchEmailSummaries,
		fetchEmailContents,
		createArchiveItemFromEmails,
		createBlobsFromAttachments,
		fetchFolders,
		ensureMailDataIsLoaded,
		isStreamingEmails,
		selectedFolder,
		setSelectedFolder,
		emails,
		folders
	}
}
