import { useEffect } from "react"
import { useSetAtom } from "jotai"
import { tagsAtom } from "./Atoms"
import { useApiClient } from "./useApiClient"
import { useSignalR } from "./useSignalR"


/**
 * @description Use this hook to ensure that tags are prefetched, and kept in sync with the server
 */
export const useTagsPrefetching = () => {
	const setTags = useSetAtom(tagsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<string[]>("/api/tag/list")
			.then(tags => {
				setTags(tags)
			})
	}, [])

	useSignalR(message => {

		switch (message.messageType) {
			case "TagsAdded": {
				console.log("*** useTagsPrefetching, message: ", message)
				setTags(tags => [...tags, message.data as string])
				break
			}
		}
	})
}
