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
  from: string
  to: string
  attachments: EmailAttachment[]
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

interface UploadAttachmentRequest {
  attachments: Attachment[]
}

interface Attachment {
  messageId: string
  fileName: string
}

export function useMailProvider() {
	const [provider, setProvider] = useState<"gmail" | "fastmail">("gmail")

	const [auth, setAuth] = useState<{isAuthenticated: boolean}>({isAuthenticated: false})
	const [emails, setEmails] = useState<Email[]>([])

	const apiClient = useApiClient()

	const login = async (): Promise<void> => {
		if (provider === "gmail") {
			const redirectUri = window.location.origin + "/auth-callback"
			const response = await apiClient.get<AuthUrlResponse>(`/api/emailingestion/${provider}/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`, null, { credentials: "include" })
			window.location.href = response.url // full redirect, no popup
		} else if (provider === "fastmail") {
			const username = prompt("FastMail username:")
			const password = prompt("FastMail app password:")
			if (username && password) {
				await apiClient.post(`/api/emailingestion/${provider}/auth/exchange`, {provider, username, password }, { credentials: "include" })
				localStorage.setItem(`auth-${provider}`, "true")
				setAuth({isAuthenticated: true})
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

			await apiClient.post(`/api/emailingestion/${providerFromState}/auth/exchange`, {provider: providerFromState, code, state, redirectUri }, { credentials: "include" })
			
			localStorage.setItem(`auth-${providerFromState}`, "true")
			setAuth({isAuthenticated: true})
		}
		return null
	}

	const listAvailableFolders = async (): Promise<string[]> => {
		if (!auth) throw new Error("Not authenticated")
		const response = await apiClient.get<string[]>(`/api/emailingestion/${provider}/list-folders`, null, { credentials: "include" })
		return response
	}

	const fetchAttachments = async (search: FindAttachmentRequest): Promise<Email[]> => {
		if (!auth) throw new Error("Not authenticated")

		const response = await apiClient.post<FindAttachmentsResponse>(`/api/emailingestion/${provider}/find-attachments`, search, { credentials: "include" })
		
		const list: Email[] = response.emails || []
		setEmails(list)
		return list
	}

	const downloadAttachment = async (messageId: string, fileName: string): Promise<void> => {
		if (!auth) throw new Error("Not authenticated")

		console.log(messageId, fileName)


		const response = await apiClient.getBlob(`/api/emailingestion/${provider}/download-attachment`, {
			messageId,
			fileName
		}, { credentials: "include" })
		
		if (!response.blob || !response.filename) throw new Error("Download failed")


		const url = window.URL.createObjectURL(response.blob)
		const a = document.createElement("a")
		a.href = url
		a.download = fileName
		a.click()
		window.URL.revokeObjectURL(url)
	}

	const uploadAttachments = async (messageId: string, emailAttachments: EmailAttachment[]): Promise<void> => {
		const body: UploadAttachmentRequest = {
			attachments: emailAttachments.map(a => ({
				messageId: messageId,
				fileName: a.fileName
			}))
		}

		apiClient.post(`/api/emailingestion/${provider}/unallocate-attachment`, body, { credentials: "include" })
	}

	return { provider, setProvider, login, handleAuthCallback, fetchAttachments, uploadAttachments, listAvailableFolders, emails, downloadAttachment, auth }
}
