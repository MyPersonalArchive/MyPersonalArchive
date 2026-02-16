import { useContext, useState } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { createQueryString } from "./createQueryString"
import { useApiClient } from "./useApiClient"


export type ProviderName = "gmail" | "fastmail" | "zohomail"


export function useRemoteAuthentication() {
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

	const { currentTenantId } = useContext(CurrentTenantIdContext)

	const apiClient = useApiClient()

	const login = async (provider: ProviderName, authType: "oauth" | "basic", returnUrl: string) => {
		switch (authType) {
			case "oauth": {
				const payload = {
					["provider-name"]: provider,
					["auth-type"]: "oauth",
					["return-url"]: returnUrl,
					["tenant-id"]: currentTenantId
				}
				const queryString = createQueryString(payload)

				window.location.href = "/api/remoteauthentication/start-authentication" + queryString
				break
			}

			case "basic": {
				//TODO: Make a full form for this instead of using prompt
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
		login,
		isAuthenticated
	}
}
