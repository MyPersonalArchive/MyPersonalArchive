import { PropsWithChildren } from "react"
import { useTagsPrefetching } from "../Utils/useTagsPrefetching"
import { useBlobsPrefetching } from "../Utils/useBlobsPrefetching"
import { useStoredFiltersPrefetching } from "../Utils/useStoredFiltersPrefetching"
import { useArchiveItemsPrefetching } from "../Utils/useArchiveItemsPrefetching"


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
	useTagsPrefetching()
	useBlobsPrefetching()
	useArchiveItemsPrefetching()
	useStoredFiltersPrefetching()

	return <>
		{children}
	</>
}