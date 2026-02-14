import { useContext, useState } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { createQueryString } from "./createQueryString"
import { useApiClient } from "./useApiClient"


export type ProviderName = "gmail" | "fastmail" | "zohomail"


export function useRemoteAuthentication() {
	const [provider, setProvider] = useState<ProviderName>("gmail")
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

	const { currentTenantId } = useContext(CurrentTenantIdContext)

	const apiClient = useApiClient()

	const login = async (returnUrl: string) => {
		switch (provider) {
			case "zohomail":
			case "gmail": {
				const payload = {
					["provider-name"]: provider,
					["return-url"]: returnUrl,
					["tenant-id"]: currentTenantId
				}
				const queryString = createQueryString(payload)

				window.location.href = "/api/remoteauthentication/start-authentication" + queryString
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
