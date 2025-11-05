import { useState } from "react"
import { useApiClient } from "./useApiClient"


export type ProviderName = "gmail" | "fastmail" | "zohomail"


export function useRemoteAuthentication() {
	const [provider, setProvider] = useState<ProviderName>("gmail")
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

	const apiClient = useApiClient()

	const login = async (returnUrl : string) => {
		switch (provider) {
			case "zohomail":
			case "gmail": {
				window.location.href = `/api/remoteauthentication/start-authentication?provider-name=${provider}&return-url=${encodeURIComponent(returnUrl)}`
				// window.location.href = `https://localhost:5054/api/remoteauthentication/start-authentication?provider-name=${provider}&return-url=${encodeURIComponent(returnUrl)}`
				break
			}

			case "fastmail": {
				const username = prompt("FastMail username:")
				const password = prompt("FastMail app password:")
				if (username && password) {
					await apiClient.post(`/api/email/${provider}/auth/exchange`, { provider, username, password }, { credentials: "include" })
					localStorage.setItem(`auth-${provider}`, "true")
					setIsAuthenticated(true)
					break
				}
			}
		}
	}


	return {
		provider,
		setProvider,
		login,
		isAuthenticated
	}
}
