import { useState, useEffect } from "react"
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

/*
public class EmailSearchCriteria
{
	public string? Subject { get; set; }
	public string? From { get; set; }
	public string? To { get; set; }
	public int Limit { get; set; }
	public DateTime? Since { get; set; }
}
*/

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
	const [provider, setProvider] = useState<"none" | "gmail" | "fastmail">("none")

	const [auth, setAuth] = useState<{isAuthenticated: boolean}>({isAuthenticated: false})
	const [attachments, setAttachments] = useState<EmailAttachment[]>([])

	const apiClient = useApiClient()

	// Restore provider + auth from storage on mount. This is because the redirect 
	useEffect(() => {
		const savedProvider = sessionStorage.getItem("pending-provider")
		if (savedProvider && (savedProvider === "gmail" || savedProvider === "fastmail")) {
			setProvider(savedProvider)
		}
		if (provider !== "none") {
			const savedAuth = localStorage.getItem(`auth-${provider}`)
			if (savedAuth) setAuth(JSON.parse(savedAuth))
		}
	}, [provider])

	useEffect(() => {
		// restore auth on mount
		const saved = localStorage.getItem(`auth-${provider}`)
		if (saved) setAuth(JSON.parse(saved))
	}, [provider])

	const login = async (): Promise<void> => {
		sessionStorage.setItem("pending-provider", provider)

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
		const savedProvider = sessionStorage.getItem("pending-provider")
		if (!savedProvider) return null

		const params = new URLSearchParams(window.location.search)
		if (params.has("code")) {
			const code = params.get("code")
			const state = params.get("state")
			const redirectUri = window.location.origin + "/auth-callback"

			await apiClient.post(`/api/emailingestion/${savedProvider}/auth/exchange`, {provider: savedProvider, code, state, redirectUri }, { credentials: "include" })
			
			localStorage.setItem(`auth-${savedProvider}`, "true")
			setAuth({isAuthenticated: true})
		}
		return null
	}

	const fetchAttachments = async (search: FindAttachmentRequest): Promise<EmailAttachment[]> => {
		if (!auth) throw new Error("Not authenticated")
		const savedProvider = sessionStorage.getItem("pending-provider")
		if (!savedProvider) return []

		const response = await apiClient.post<FindAttachmentsResponse>(`/api/emailingestion/${savedProvider}/find-attachments`, search, { credentials: "include" })
		
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
