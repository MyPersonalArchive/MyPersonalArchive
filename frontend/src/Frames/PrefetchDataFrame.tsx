import { PropsWithChildren } from "react"
import { useTagsPrefetching } from "../Utils/useTagsPrefetching"
import { useBlobsPrefetching } from "../Utils/useBlobsPrefetching"
import { useStoredFiltersPrefetching } from "../Utils/useStoredFiltersPrefetching"


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
	useTagsPrefetching()
	useBlobsPrefetching()
	useStoredFiltersPrefetching()

	return <>
		{children}
	</>
}