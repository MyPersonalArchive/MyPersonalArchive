import { PropsWithChildren } from "react";
import { useTagsPrefetching } from "../Utils/useTagsPrefetching";
import { useUnallocatedBlobsPrefetching } from "../Utils/useUnallocatedBlobsPrefetching";


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
    useTagsPrefetching()
    useUnallocatedBlobsPrefetching()

    return <>
        {children}
    </>
}