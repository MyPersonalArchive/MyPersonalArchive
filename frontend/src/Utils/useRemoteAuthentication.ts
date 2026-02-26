import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { createQueryString } from "./createQueryString"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"


export function useRemoteAuthentication() {
	const { currentTenantId } = useContext(CurrentTenantIdContext)

	const navigate = useNavigate()

	const login = async (provider: string, authType: "oauth" | "basic", returnUrl: string) => {
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
				navigate(`${RoutePaths.ExternalAuthentication.Basic}/${provider}`)
				break
			}
		}
	}


	return {
		login
	}
}
