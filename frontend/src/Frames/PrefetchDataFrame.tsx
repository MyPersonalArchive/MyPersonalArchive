import { PropsWithChildren } from "react"
import { useTagsPrefetching } from "../Utils/Hooks/useTagsPrefetching"
import { useBlobsPrefetching } from "../Utils/Hooks/useBlobsPrefetching"
import { useStoredFiltersPrefetching } from "../Utils/Hooks/useStoredFiltersPrefetching"
import { useArchiveItemsPrefetching } from "../Utils/Hooks/useArchiveItemsPrefetching"
import { useExternalAccountsPrefetching } from "../Utils/Hooks/useAccountsPrefetching"


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
	useTagsPrefetching()
	useBlobsPrefetching()
	useArchiveItemsPrefetching()
	useStoredFiltersPrefetching()
	useExternalAccountsPrefetching()

	return <>
		{children}
	</>
}