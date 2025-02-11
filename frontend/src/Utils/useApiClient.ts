import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { accessTokenAtom, loggedInUserAtom, selectedTenantIdAtom } from "./Atoms"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"


export const useApiClient = () => {
    const setLoggedInUser = useSetAtom(loggedInUserAtom)
    const selectedTenantId = useAtomValue(selectedTenantIdAtom)
    const [accessToken, setAccessToken] = useAtom(accessTokenAtom)
    const navigate = useNavigate()

    const currentPath = window.location.pathname

    const commonHeaders: any = {}
    if (accessToken !== null) {
        commonHeaders.Authorization = `Bearer ${accessToken}`
    }
    if (selectedTenantId !== null) {
        commonHeaders["X-Tenant-Id"] = selectedTenantId
    }

    const interceptedFetch = (url: string, options: RequestInit, retryAfterRefreshingToken = true): Promise<Response> => {
        options = {
            ...options,
            credentials: options.credentials ?? "omit",
            headers: {
                ...options.headers,
                ...commonHeaders
            }
        }
        return fetch(url, options)
            .then(async response => {
                if (response.status === 401 && retryAfterRefreshingToken) {
                    // 401 error - attempting to use refresh token
                    //TODO: Use Token issuer for the refresh url
                    const response = await fetch("/api/authentication/refresh", {
                        method: "POST",
                        credentials: "include", // needed so that http-only cookies are sent with this request (Should it be "include" or "same-origin"?)
                        headers: { "Content-Type": "application/json" }
                    })
                    if(response.status === 403) {
                        navigate(RoutePaths.SignIn + `?redirect=${currentPath}`)
                        return response
                    }

                    const json = await response.json() as RefreshResponse

                    setAccessToken(json.accessToken)
                    const user = { username: json.username, fullname: json.fullname }
                    setLoggedInUser(user)

                    commonHeaders.Authorization = `Bearer ${json.accessToken}`
                    return interceptedFetch(url, options, false)
                }

                return response
            })
    }


    return {
        get: async <T>(url: string, payload: any = {}, incomingOptions?: RequestInit) => {
            let queryString
            if (payload != undefined) {
                queryString = new URLSearchParams(payload).toString()
                if (queryString != "") {
                    queryString = "?" + queryString
                }
            }
            const options = {
                ...incomingOptions,
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }

            return interceptedFetch(url + queryString, options)
                .then(response => response?.json() as T)
        },

        post: async <T>(url: string, payload: any, incomingOptions: RequestInit) => {
            const options = {
                ...incomingOptions,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }

            return interceptedFetch(url, options)
                .then(response => response?.json() as T)
        },

        put: async <T>(url: string, payload: any, incomingOptions: RequestInit) => {
            const options = {
                ...incomingOptions,
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }

            return interceptedFetch(url, options)
                .then(response => response?.json() as T)
        },

        delete: async <T>(url: string, payload: any, incomingOptions: RequestInit) => {
            let queryString
            if (payload != undefined) {
                queryString = new URLSearchParams(payload).toString()
                if (queryString != "") {
                    queryString = "?" + queryString
                }
            }
            const options = {
                ...incomingOptions,
                method: "DELETE"
            }

            return interceptedFetch(url + queryString, options)
                .then(response => response?.json() as T)
        }
    }

}


type RefreshResponse = {
    username: string
    fullname: string
    accessToken: string
}