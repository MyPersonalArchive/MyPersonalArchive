import { PropsWithChildren } from "react";
import { useTagsPrefetching } from "../Utils/useTagsPrefetching";
import { useUnallocatedBlobsPrefetching } from "../Utils/useUnallocatedBlobsPrefetching";
import { usePredefinedSearchesPrefetching } from "../Utils/usePredefinedSearchPrefetching";


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
    useTagsPrefetching()
    useUnallocatedBlobsPrefetching()
    usePredefinedSearchesPrefetching()

    return <>
        {children}
    </>
}