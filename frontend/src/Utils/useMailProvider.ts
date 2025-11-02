import { useEffect, useState } from "react"
import { useApiClient } from "./useApiClient"

type OAuthAuth = {
	accessToken: string
	refreshToken?: string
}

type AuthUrlResponse = {
	url: string
	state: string
}

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
	provider: string
	folders?: string[]
	subject?: string
	from?: string
	to?: string
	limit?: number
	since?: string
}


export function useMailProvider() {
	const [provider, setProvider] = useState<"gmail" | "fastmail">("gmail")

	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
	const [emails, setEmails] = useState<Email[]>([])
	const [folders, setFolders] = useState<string[] | undefined>(undefined)
	const [selectedFolder, setSelectedFolder] = useState<string | undefined>(undefined)

	const apiClient = useApiClient()

	useEffect(() => {
		if (!isAuthenticated)
			return

		console.log("useEffect on isAuthenticated change to true")
		fetchFolders()
	}, [isAuthenticated, provider])

	useEffect(() => {
		console.log("useEffect on folders change:", folders)
		setSelectedFolder(folders?.at(0))
		console.log("Selected folder set to:", folders?.at(0))
	}, [folders])

	const login = async (): Promise<void> => {
		if (provider === "gmail") {
			const redirectUri = window.location.origin + "/auth-callback"
			const response = await apiClient.get<AuthUrlResponse>(`/api/email/${provider}/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`, null, { credentials: "include" })
			window.location.href = response!.url // full redirect, no popup
		} else if (provider === "fastmail") {
			const username = prompt("FastMail username:")
			const password = prompt("FastMail app password:")
			if (username && password) {
				await apiClient.post(`/api/email/${provider}/auth/exchange`, { provider, username, password }, { credentials: "include" })
				localStorage.setItem(`auth-${provider}`, "true")
				setIsAuthenticated(true)
			}
		}
	}

	const handleAuthCallback = async (): Promise<OAuthAuth | null> => {
		let providerFromState = undefined

		const params = new URLSearchParams(window.location.search)
		if (params.has("code")) {
			const code = params.get("code")
			const state = params.get("state")
			if (!code || !state) {
				console.warn("Missing OAuth code or state")
				return null
			}

			try {
				const decoded = decodeURIComponent(state)
				const parsed = JSON.parse(decoded)
				if (parsed.provider === "gmail" || parsed.provider === "fastmail") {
					providerFromState = parsed.provider
					setProvider(providerFromState)
				}
			} catch (err) {
				console.error("Failed to parse state:", err)
			}

			if (!providerFromState) {
				console.warn("Could not determine provider from OAuth state")
				return null
			}

			const redirectUri = window.location.origin + "/auth-callback"

			await apiClient.post(`/api/email/${providerFromState}/auth/exchange`, { provider: providerFromState, code, state, redirectUri }, { credentials: "include" })

			localStorage.setItem(`auth-${providerFromState}`, "true")
			setIsAuthenticated(true)
		}
		//TODO: Why is fetching folders and setting selectFolder not shown in the UI after auth?
		// await fetchFolders()
		return null
	}

	const fetchFolders = async () => {
		// if (!isAuthenticated) throw new Error("Not authenticated")

		//TODO: Why is fetching folders and setting selectFolder not shown in the UI after auth?
		// It works fine when called from refresh!

		// Should this be handled with useEffect on return value?

		const folders = await apiClient.get<string[]>(`/api/email/${provider}/list-folders`, null, { credentials: "include" })
		setFolders(folders)
		// console.log("** 3 ** Setting selected folder to:", folders?.at(0))
		// setSelectedFolder(folders?.at(0))
		// console.log("** 4 ** Selected folder set to:", selectedFolder)
	}

	const fetchEmails = async (search: FindAttachmentRequest) => {
		// if (!isAuthenticated) throw new Error("Not authenticated")

		const emails = await apiClient.post<Email[]>(`/api/email/${provider}/list`, search, { credentials: "include" })
		setEmails((emails ?? []))
	}

	const createArchiveItemFromEmails = async (emails: Email[]) => {
		const body = {
			folder: selectedFolder,
			messageIds: emails.map(email => email.uniqueId)
		}

		await apiClient.post(`/api/email/${provider}/create-archive-item-from-emails`, body, { credentials: "include" })
	}

	const createBlobsFromAttachments = async (messageId: string, emailAttachments: EmailAttachment[]) => {
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
		provider,
		setProvider,
		login,
		handleAuthCallback,
		isAuthenticated,
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
