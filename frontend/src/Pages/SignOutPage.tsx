
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useSetAtom } from "jotai"
import { accessTokenAtom, loggedInUserAtom } from "../Utils/Atoms"
import { useApiClient } from "../Utils/useApiClient"
import { RESET } from "jotai/utils"


export const SignOutPage = () => {
    const [loggedInUser, setLoggedInUser] = useAtom(loggedInUserAtom)
    const setAccessToken = useSetAtom(accessTokenAtom)
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        logoutAction().then(() => navigate(RoutePaths.Index))
    }, [])

    async function logoutAction() {
        try {
            if (loggedInUser !== null) {
                // const username = loggedInUser.username
                await apiClient.post("/api/authentication/signout", null, { credentials: "include" })    // will trow if not authenticated
            }
        } finally {
            setLoggedInUser(undefined)
            setAccessToken(undefined)
            navigate(RoutePaths.Index)
        }
    }


    return (
        <>
            <h1>Signing out...</h1>
        </>
    )
}
