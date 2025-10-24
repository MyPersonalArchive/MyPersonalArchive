import { useState } from "react"
import { useApiClient } from "./useApiClient"

type OAuthAuth = {
	accessToken: string
	refreshToken?: string
}

export type EmailAttachment = {
	fileName: string
	contentType: string
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

type AuthUrlResponse = {
	url: string
	state: string
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

type FindAttachmentsResponse = {
	emails: Email[]
}

interface Attachment {
	messageId: string
	fileName: string
}

export function useMailProvider() {
	const [provider, setProvider] = useState<"gmail" | "fastmail">("gmail")

	const [auth, setAuth] = useState<{ isAuthenticated: boolean }>({ isAuthenticated: false })
	const [emails, setEmails] = useState<Email[]>([])
	const [folders, setFolders] = useState<string[]>([])

	const apiClient = useApiClient()

	const login = async (): Promise<void> => {
		if (provider === "gmail") {
			const redirectUri = window.location.origin + "/auth-callback"
			const response = await apiClient.get<AuthUrlResponse>(`/api/email/${provider}/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`, null, { credentials: "include" })
			window.location.href = response.url // full redirect, no popup
		} else if (provider === "fastmail") {
			const username = prompt("FastMail username:")
			const password = prompt("FastMail app password:")
			if (username && password) {
				await apiClient.post(`/api/email/${provider}/auth/exchange`, { provider, username, password }, { credentials: "include" })
				localStorage.setItem(`auth-${provider}`, "true")
				setAuth({ isAuthenticated: true })
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
			setAuth({ isAuthenticated: true })
		}
		return null
	}

	const fetchFolders = async () => {
		if (!auth) throw new Error("Not authenticated")

		const response = await apiClient.get<string[]>(`/api/email/${provider}/list-folders`, null, { credentials: "include" })
		setFolders(response)
	}

	const fetchEmails = async (search: FindAttachmentRequest) => {
		if (!auth) throw new Error("Not authenticated")

		const response = await apiClient.post<FindAttachmentsResponse>(`/api/email/${provider}/list`, search, { credentials: "include" })
		setEmails((response.emails || []))
	}

	const ingestAttachments = async (messageId: string, emailAttachments: EmailAttachment[]) => {
		console.log("*** 2 *** Ingesting attachments for messageId:", messageId, emailAttachments)
		const body = {
			attachments: emailAttachments.map(a => ({
				messageId: messageId,
				fileName: a.fileName
			}))
		}
		console.log("*** 2 *** Request body:", body)
		await apiClient.post(`/api/email/${provider}/unallocate-attachment`, body, { credentials: "include" })
		console.log("*** 3 *** Ingestion request sent")
	}

	return { provider, setProvider, login, handleAuthCallback, fetchEmails, ingestAttachments, fetchFolders, emails, folders, auth }
}
