import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { createQueryString } from "./createQueryString"
import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"


export const useApiClient = () => {
	const { currentTenantId } = useContext(CurrentTenantIdContext)
	const navigate = useNavigate()
	
	const commonHeaders: any = {}
	if (currentTenantId !== null) {
		commonHeaders["X-Tenant-Id"] = currentTenantId
	}

	const interceptedFetch = (url: string, options: RequestInit): Promise<Response> => {
		options = {
			...options,
			credentials: options.credentials ?? "same-origin",
			headers: {
				...options.headers,
				...commonHeaders
			}
		}
		return fetch(url, options)
			.then(async response => {
				// if(response.status === 302) {
				// 	console.log("Got status 302 - Should redirected to login page?", response)
				// 	throw new Error("HTTP response status 302 is not handled properly yet")
				// }

				if(response.status === 401) {
					navigate(RoutePaths.SignIn + "?redirect=/archive/list")
				}
				return response
			})
			.catch(error => {
				console.error("Network or other error during fetch:", error)
				throw error
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
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		},

		getBlob: async (url: string, payload: any = {}, incomingOptions?: RequestInit) => {
			const queryString = createQueryString(payload)
			const options = {
				...incomingOptions,
				method: "GET",
				headers: { "Content-Type": "application/json" },
			}

			return interceptedFetch(url + queryString, options)
				.then(async response => {
					let filename = ""
					const contentDisposition = response.headers.get("Content-Disposition")

					if (contentDisposition) {
						const regex = /filename="([^"]+)"|filename\*=UTF-8''([^;]+)/
						const matches = contentDisposition.match(regex)
						if (matches && (matches[1] || matches[2])) {
							filename = matches[1] || matches[2] || ""
						}
					}

					return {
						blob: await response?.blob(),
						filename: filename
					}
				})
		},

		post: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
			const options = {
				...incomingOptions,
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}

			return interceptedFetch(url, options)
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		},
		
		postFormData: async <T>(url: string, payload: FormData, incomingOptions?: RequestInit) => {
			const options = {
				...incomingOptions,
				method: "POST",
				body: payload
			}

			return interceptedFetch(url, options)
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		},

		put: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
			const options = {
				...incomingOptions,
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}

			return interceptedFetch(url, options)
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		},

		putFormData: async <T>(url: string, payload: FormData, incomingOptions?: RequestInit) => {
			const options = {
				...incomingOptions,
				method: "PUT",
				body: payload
			}

			return interceptedFetch(url, options)
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		},

		delete: async <T>(url: string, payload: any, incomingOptions?: RequestInit) => {
			const queryString = createQueryString(payload)
			const options = {
				...incomingOptions,
				method: "DELETE"
			}

			return interceptedFetch(url + queryString, options)
				.then(response => {
					if (response.status === 200) {
						return response.json() as T
					}
					return undefined
				})
		}

	}
}
