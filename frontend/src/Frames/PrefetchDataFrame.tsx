import { PropsWithChildren } from "react"
import { useTagsPrefetching } from "../Utils/useTagsPrefetching"
import { useUnallocatedBlobsPrefetching } from "../Utils/useUnallocatedBlobsPrefetching"
import { useStoredFiltersPrefetching } from "../Utils/useStoredFiltersPrefetching"


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
	useTagsPrefetching()
	useUnallocatedBlobsPrefetching()
	useStoredFiltersPrefetching()

	return <>
		{children}
	</>
}