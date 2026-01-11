import { PropsWithChildren } from "react"
import { useTagsPrefetching } from "../Utils/useTagsPrefetching"
import { useBlobsPrefetching } from "../Utils/useBlobsPrefetching"
import { useStoredFiltersPrefetching } from "../Utils/useStoredFiltersPrefetching"
import { useArchiveItemsPrefetching } from "../Utils/useArchiveItemsPrefetching"
import { useAccountsPrefetching } from "../Utils/useAccountsPrefetching"


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
	useTagsPrefetching()
	useBlobsPrefetching()
	useArchiveItemsPrefetching()
	useStoredFiltersPrefetching()
	useAccountsPrefetching()

	return <>
		{children}
	</>
}