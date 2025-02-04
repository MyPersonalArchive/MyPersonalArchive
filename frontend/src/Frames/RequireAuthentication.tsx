import { useEffect } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtomValue } from "jotai"
import { loggedInUserAtom } from "../Utils/Atoms"


export const RequireAuthentication = () => {
    const loggedInUser = useAtomValue(loggedInUserAtom)
    const navigate = useNavigate()

    useEffect(() => {
        if (loggedInUser === null) {
            navigate(RoutePaths.SignIn)
        }
    }, [loggedInUser, navigate])

    return <>
        <Outlet />
    </>
}