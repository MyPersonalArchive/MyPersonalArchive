import { useAtom } from "jotai"
import { PropsWithChildren, useEffect } from "react"
import { currentUserAtom } from "../Utils/Atoms"


type CurrentUserInfoResponse = {
	username: string
	fullname: string
	availableTenantIds: number[]
	accessToken: string
}


//Root frame checks authentication status and load current user info if authenticated on app load
export const RootFrame = ({ children }: PropsWithChildren) => {
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom)

	useEffect(() => {
		if (currentUser === undefined) {
			(async () => {
				try {
					const httpResponse = await fetch("/api/authentication/current-user-info", {
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
						availableTenantIds: response.availableTenantIds
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
