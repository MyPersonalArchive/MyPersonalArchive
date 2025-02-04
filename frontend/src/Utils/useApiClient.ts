import { useAtom } from "jotai"
import { accessTokenAtom, loggedInUserAtom } from "./Atoms"


export const useApiClient = () => {
    const [loggedInUser, setLoggedInUser] = useAtom(loggedInUserAtom)
    const [accessToken, setAccessToken] = useAtom(accessTokenAtom)

    const commonHeaders: any = {}
    if (loggedInUser !== null) {
        commonHeaders.Authorization = `Bearer ${accessToken}`
        commonHeaders.username = loggedInUser?.username
    }

    const interceptedFetch = (url: string, options: RequestInit, retryAfterRefreshingToken = true): Promise<Response> => {
        options = {
            ...options,
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

        // put: async <T>(url: string, payload: any, incomingOptions: RequestInit) => {
        //     const options = {
        //         ...incomingOptions,
        //         method: "PUT",
        //         headers: { "Content-Type": "application/json" },
        //         body: JSON.stringify(payload)
        //     }

        //     return interceptedFetch(url, options)
        //         .then(response => response?.json() as T)
        // },

        // delete: async <T>(url: string, payload: any, incomingOptions: RequestInit) => {
        //     let queryString
        //     if (payload != undefined) {
        //         queryString = new URLSearchParams(payload).toString()
        //         if (queryString != "") {
        //             queryString = "?" + queryString
        //         }
        //     }
        //     const options = {
        //         ...incomingOptions,
        //         method: "DELETE"
        //     }

        //     return interceptedFetch(url + queryString, options)
        //         .then(response => response?.json() as T)
        // }
    }

}


type RefreshResponse = {
    username: string
    fullname: string
    accessToken: string
}