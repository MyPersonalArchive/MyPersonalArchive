import { useAtom } from "jotai"
import { PropsWithChildren, useEffect } from "react"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"


type CurrentUserInfoResponse = {
	username: string
	fullname: string
	tenantId: string
	roles: string[]
}


//Root frame checks authentication status and load current user info if authenticated on app load
export const RootFrame = ({ children }: PropsWithChildren) => {
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom)

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

					const response = await httpResponse.json() as CurrentUserInfoResponse
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
				}
			})()
		}
	}, [currentUser])

	return <>{children}</>
}
