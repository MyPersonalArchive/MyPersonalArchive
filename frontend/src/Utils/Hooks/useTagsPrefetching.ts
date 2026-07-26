import { useEffect } from "react"
import { useAtomValue, useSetAtom } from "jotai"
import { tagsAtom } from "../Atoms/tagsAtom"
import { useApiClient } from "./useApiClient"
import { useSignalR } from "./useSignalR"
import { archiveItemsAtom } from "../Atoms/archiveItemsAtom"


/**
 * @description Use this hook to ensure that tags are prefetched, and kept in sync with the server
 */
export const useTagsPrefetching = () => {
	const setTags = useSetAtom(tagsAtom)

	const archiveItems = useAtomValue(archiveItemsAtom)
	setTags(new Set<string>(archiveItems.flatMap(item => item.tags)))
}
