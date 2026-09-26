import { createQueryString } from "../createQueryString"
import { useNavigate, generatePath } from "react-router-dom"
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
				navigate(generatePath(RoutePaths.ExternalAuthentication.Basic, { provider }))
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
