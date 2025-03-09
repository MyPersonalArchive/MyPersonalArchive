import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { accessTokenAtom, loggedInUserAtom, selectedTenantIdAtom } from "./Atoms"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"


type RefreshResponse = {
    username: string
    fullname: string
    accessToken: string
}


export const useApiClient = ({skipAuthentication = false} = {}) => {
    const setLoggedInUser = useSetAtom(loggedInUserAtom)
    const selectedTenantId = useAtomValue(selectedTenantIdAtom)
    const [accessToken, setAccessToken] = useAtom(accessTokenAtom)
    const navigate = useNavigate()

    const currentPath = window.location.pathname

    const commonHeaders: any = {}
    if (accessToken !== undefined && !skipAuthentication) {
        commonHeaders.Authorization = `Bearer ${accessToken}`
    }
    if (selectedTenantId !== null && !skipAuthentication) {
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
                if (response.status === 401 && retryAfterRefreshingToken && !skipAuthentication) {
                    // 401 error - attempting to use refresh token
                    //TODO: Use Token issuer for the refresh url
                    const response = await fetch("/api/authentication/refresh", {
                        method: "POST",
                        credentials: "include", // needed so that http-only cookies are sent with this request (Should it be "include" or "same-origin"?)
                        headers: { "Content-Type": "application/json" }
                    })
                    if (response.status === 403) {
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
                .then(response => response?.json() as T)
        }

    }
}


function createQueryString(payload: any) {
    if (payload != undefined) {
        const params = new URLSearchParams()

        Object.entries(payload).forEach(([key, value]: [string, any]) => {
            if (Array.isArray(value)) {
                value.forEach(val => { params.append(key, val) })
            } else if (value === null) {
                params.append(key, "")
            } else if (value !== undefined) {
                params.append(key, value)
            }
        })
        return `?${params}`
    }
    return undefined
}
