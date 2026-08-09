import { useContext } from "react"
import { createQueryString } from "../createQueryString"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../../RoutePaths"


export function useRemoteAuthentication() {
	const navigate = useNavigate()

	const login = async (provider: string, authType: string, returnUrl: string) => {
		switch (authType) {
			case "oauth": {
				const payload = {
					["provider-name"]: provider,
					["auth-type"]: "oauth",
					["return-url"]: returnUrl,
				}
				const queryString = createQueryString(payload)

				window.location.href = "/api/remoteauthentication/start-authentication" + queryString
				break
			}

			case "basic": {
				navigate(`${RoutePaths.ExternalAuthentication.Basic}/${provider}`)
				break
			}

			default:
				throw new Error(`Unsupported authentication type: ${authType}`)
		}
	}


	return {
		login
	}
}
