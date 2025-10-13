import { useState } from "react"
import { useApiClient } from "./useApiClient"

type OAuthAuth = {
  accessToken: string
  refreshToken?: string
}

export type EmailAttachment = {
  subject: string
  from: string
  date: string
  fileName: string
  messageId: string
}

type AuthUrlResponse = {
  url: string
  state: string
}

type FindAttachmentRequest = {
	provider: string
	subject?: string
	from?: string
	to?: string
	limit?: number
	since?: string
}

type FindAttachmentsResponse = {
  attachments: EmailAttachment[]
}

export function useMailProvider() {
	const [provider, setProvider] = useState<"gmail" | "fastmail">("gmail")

	const [auth, setAuth] = useState<{isAuthenticated: boolean}>({isAuthenticated: false})
	const [attachments, setAttachments] = useState<EmailAttachment[]>([])

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

	const fetchAttachments = async (search: FindAttachmentRequest): Promise<EmailAttachment[]> => {
		if (!auth) throw new Error("Not authenticated")

		const response = await apiClient.post<FindAttachmentsResponse>(`/api/emailingestion/${provider}/find-attachments`, search, { credentials: "include" })
		
		const list: EmailAttachment[] = response.attachments || []
		setAttachments(list)
		return list
	}

	const downloadAttachment = async (messageId: string, fileName: string): Promise<void> => {
		if (!auth) throw new Error("Not authenticated")

		const response = await apiClient.getBlob(`/api/emailingestion/${provider}/download-attachment`, {
			messageId,
			fileName
		}, { credentials: "include" })
		
		if (!response.blob) throw new Error("Download failed")

		const url = window.URL.createObjectURL(response.blob)
		const a = document.createElement("a")
		a.href = url
		a.download = fileName
		a.click()
		window.URL.revokeObjectURL(url)
	}

	return { provider, setProvider, login, handleAuthCallback, fetchAttachments, attachments, downloadAttachment, auth }
}
