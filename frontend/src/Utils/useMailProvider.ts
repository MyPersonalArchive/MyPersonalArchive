import { useState, useEffect } from "react"

type OAuthAuth = {
  accessToken: string
  refreshToken?: string
}

type BasicAuth = {
  username: string
  password: string
}

type AuthContext = OAuthAuth | BasicAuth | null;

export type Attachment = {
  subject: string
  from: string
  date: string
  fileName: string
  messageId: string
}

export function useMailProvider() {
	const [provider, setProvider] = useState<"none" | "gmail" | "fastmail">("none")

	const [auth, setAuth] = useState<AuthContext>(null)
	const [attachments, setAttachments] = useState<Attachment[]>([])

	useEffect(() => {
		// restore auth on mount
		const saved = localStorage.getItem(`auth-${provider}`)
		if (saved) setAuth(JSON.parse(saved))
	}, [provider])

	async function login(): Promise<void> {
		if (provider === "gmail") {
			const redirectUri = window.location.origin + "/auth-callback"
			const res = await fetch(`/api/emailingestion/${provider}/auth/url?redirectUri=${encodeURIComponent(redirectUri)}`)
			const { url } = await res.json()
			window.location.href = url // full redirect, no popup
		} else if (provider === "fastmail") {
			const username = prompt("FastMail username:")
			const password = prompt("FastMail app password:")
			if (username && password) {
				const creds: BasicAuth = { username, password }
				setAuth(creds)
				localStorage.setItem(`auth-${provider}`, JSON.stringify(creds))
			}
		}
	}

	async function handleAuthCallback(): Promise<OAuthAuth | null> {
		const params = new URLSearchParams(window.location.search)
		if (params.has("code")) {
			const code = params.get("code")
			const state = params.get("state")
			const redirectUri = window.location.origin + "/auth-callback"

			const res = await fetch(`/api/emailingestion/${provider}/auth/exchange`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code, state, redirectUri }),
			})

			if (res.ok) {
				const tokens: OAuthAuth = await res.json()
				setAuth(tokens)
				localStorage.setItem(`auth-${provider}`, JSON.stringify(tokens))
				return tokens
			}
		}
		return null
	}

	async function fetchAttachments(): Promise<Attachment[]> {
		if (!auth) throw new Error("Not authenticated")
		const res = await fetch(`/api/emailingestion/${provider}/find-attachments`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(auth),
		})
		const json = await res.json()
		const list: Attachment[] = json.attachments || []
		setAttachments(list)
		return list
	}

	async function downloadAttachment(messageId: string, fileName: string): Promise<void> {
		if (!auth) throw new Error("Not authenticated")

		const res = await fetch(`/api/emailingestion/${provider}/download-attachment`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...auth, messageId, fileName }),
		})
		if (!res.ok) throw new Error("Download failed")

		const blob = await res.blob()
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement("a")
		a.href = url
		a.download = fileName
		a.click()
		window.URL.revokeObjectURL(url)
	}

	return { provider, setProvider, login, handleAuthCallback, fetchAttachments, attachments, downloadAttachment, auth }
}
