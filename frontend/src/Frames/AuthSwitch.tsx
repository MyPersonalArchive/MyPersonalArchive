import { ReactNode } from "react"
import { useAtomValue } from "jotai"
import { currentUserAtom, authResolvedAtom, User } from "../Utils/Atoms/currentUserAtom"


type Props = {
	authorized?: ReactNode | ((user: User) => ReactNode)
	anonymous?: ReactNode
}

// Renders different content for signed in and anonymous users on the same route
export const AuthSwitch = ({ authorized, anonymous }: Props) => {
	const currentUser = useAtomValue(currentUserAtom)
	const authResolved = useAtomValue(authResolvedAtom)

	if (!authResolved) {
		// while authentication status is being resolved, render nothing
		return null
	}

	return currentUser
		? (typeof authorized === "function" ? authorized(currentUser) : authorized)
		: anonymous
}
