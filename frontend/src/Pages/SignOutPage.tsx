
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { RoutePaths } from "../RoutePaths"
import { useAtom } from "jotai"
import { currentUserAtom } from "../Utils/Atoms"
import { useApiClient } from "../Utils/useApiClient"


export const SignOutPage = () => {
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom)
	const navigate = useNavigate()
	const apiClient = useApiClient()

	useEffect(() => {
		logoutAction().then(() => navigate(RoutePaths.Index))
	}, [])


	async function logoutAction() {
		try {
			if (currentUser !== null) {
				await apiClient.post("/api/authentication/signout", null, { credentials: "include" })    // will trow if not authenticated
			}
		} finally {
			setCurrentUser(undefined)
			navigate(RoutePaths.Index)
		}
	}


	return (
		<>
			<h1 className="heading-2">
				Signing out...
			</h1>
		</>
	)
}
