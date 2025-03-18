import { useAtomValue, useSetAtom } from "jotai"
import { accessTokenAtom, loggedInUserAtom, lastSelectedTenantIdAtom } from "./Atoms"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { createQueryString } from "./createQueryString"
import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdFrame"


type RefreshResponse = {
    username: string
    fullname: string
    availableTenantIds: number[]
    accessToken: string
}

export const useRefresh = () => {
    const setLoggedInUser = useSetAtom(loggedInUserAtom)
    const { switchToTenantId } = useContext(CurrentTenantIdContext)
    const setAccessToken = useSetAtom(accessTokenAtom)
    const lastUsedTenantId = useAtomValue(lastSelectedTenantIdAtom)
    const navigate = useNavigate()

    return async () => {
        // 401 error - attempting to use refresh token
        //TODO: Use Token issuer for the refresh url
        const response = await fetch("/api/authentication/refresh", {
            method: "POST",
            credentials: "include", // needed so that http-only cookies are sent with this request (Should it be "include" or "same-origin"?)
            headers: { "Content-Type": "application/json" }
        })
        if (response.status === 403) {
            const currentPath = window.location.pathname

            navigate(RoutePaths.SignIn + `?redirect=${currentPath}`)
            return undefined
        }

        const json = await response.json() as RefreshResponse

        setAccessToken(json.accessToken)
        const user = { username: json.username, fullname: json.fullname, availableTenantIds: json.availableTenantIds }
        setLoggedInUser(user)
        switchToTenantId(lastUsedTenantId!)

        return json
    }
}


export const useApiClient = () => {
    const { currentTenantId } = useContext(CurrentTenantIdContext)
    const accessToken = useAtomValue(accessTokenAtom)
    const refresh = useRefresh()

    const commonHeaders: any = {}
    if (accessToken !== undefined) {
        commonHeaders.Authorization = `Bearer ${accessToken}`
    }
    if (currentTenantId !== null) {
        commonHeaders["X-Tenant-Id"] = currentTenantId
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
                    var json = await refresh()

                    commonHeaders.Authorization = `Bearer ${json!.accessToken}`
                    return interceptedFetch(url, options, false)
                }

                return response
            })
    }


    return {
        get: async <T>(url: string, payload: any = {}, incomingOptions?: RequestInit) => {
            const queryString = createQueryString(payload)
            const options = {
                ...incomingOptions,
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }

            return interceptedFetch(url + queryString, options)
                .then(response => response?.json() as T)
        },

        getBlob: async (url: string, payload: any = {}, incomingOptions?: RequestInit) => {
            const queryString = createQueryString(payload)
            const options = {
                ...incomingOptions,
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }

            return interceptedFetch(url + queryString, options)
                .then(response => response?.blob())
        },

        post: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
            const options = {
                ...incomingOptions,
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }

            return interceptedFetch(url, options)
                .then(response => response?.json() as T)
        },
        postFormData: async <T>(url: string, payload: FormData, incomingOptions?: RequestInit) => {
            const options = {
                ...incomingOptions,
                method: "POST",
                body: payload
            }

            return interceptedFetch(url, options)
                .then(response => response?.json() as T)
        },

        put: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
            const options = {
                ...incomingOptions,
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }

            return interceptedFetch(url, options)
                .then(response => response?.json() as T)
        },

        delete: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
            const queryString = createQueryString(payload)
            const options = {
                ...incomingOptions,
                method: "DELETE"
            }

            return interceptedFetch(url + queryString, options)
                .then(response => {
                    //Should we have this as a common part of the response parsing? 
                    //We are not always returning json... If we are not json we crash
                    if(response.status === 200) {
                        return response.json() as T
                    } 
                    return undefined
                })
        }

    }
}
