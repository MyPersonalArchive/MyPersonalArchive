import { useAtom, useSetAtom } from "jotai"
import { PropsWithChildren, useEffect } from "react"
import { authSettingsAtom } from "../Utils/Atoms/authSettingsAtom"
import { currentUserAtom, authResolvedAtom } from "../Utils/Atoms/currentUserAtom"


type GetAuthSettingsResponse = {
	oidcAuthUrl: string
	oidcRegisterUrl: string
	isManaged: boolean
}

type GetCurrentUserInfoResponse = {
	username: string
	fullname: string
	tenantId: string
	roles: string[]
}


//Root frame checks authentication status and load current user info if authenticated on app load
export const RootFrame = ({ children }: PropsWithChildren) => {
	const setAuthSettings = useSetAtom(authSettingsAtom)
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom)
	const setAuthResolved = useSetAtom(authResolvedAtom)

	useEffect(() => {
		(async () => {
			const httpResponse = await fetch("/api/query/GetAuthSettings", {
				credentials: "same-origin",
				headers: {
					"Content-Type": "application/json"
				}
			})

			if (!httpResponse.ok) {
				setAuthSettings({ oidcAuthUrl: undefined, oidcRegisterUrl: undefined, isManaged: undefined })
				return null
			}

			const response = await httpResponse.json() as GetAuthSettingsResponse
			const settings = {
				oidcAuthUrl: response.oidcAuthUrl,
				oidcRegisterUrl: response.oidcRegisterUrl,
				isManaged: response.isManaged
			}
			setAuthSettings(settings)
		})()

	}, [])

	useEffect(() => {
		if (currentUser === undefined) {
			(async () => {
				try {
					const httpResponse = await fetch("/api/query/getCurrentUserInfo", {
						credentials: "same-origin",
						headers: {
							"Content-Type": "application/json"
						}
					})

					if (!httpResponse.ok) {
						setCurrentUser(undefined)
						return null
					}

					const response = await httpResponse.json() as GetCurrentUserInfoResponse
					const user = {
						username: response.username,
						fullname: response.fullname,
						tenantId: response.tenantId,
						roles: new Set(response.roles)
					}
					setCurrentUser(user)
				} catch (error) {
					console.error("Auth check failed:", error)
					return null
				} finally {
					setAuthResolved(true)
				}
			})()
		}
	}, [currentUser])

	return <>{children}</>
}
