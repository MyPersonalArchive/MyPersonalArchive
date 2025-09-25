import { PropsWithChildren, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtomValue } from "jotai"
import { loggedInUserAtom } from "../Utils/Atoms"


export const RequireAuthentication = ({ children }: PropsWithChildren) => {
	const loggedInUser = useAtomValue(loggedInUserAtom)
	const navigate = useNavigate()

	const currentPath = window.location.pathname

	useEffect(() => {
		if (loggedInUser === null) {
			navigate(RoutePaths.SignIn + `?redirect=${currentPath}`)
		}
	}, [loggedInUser, navigate])

	return <>
		{children}
	</>
}