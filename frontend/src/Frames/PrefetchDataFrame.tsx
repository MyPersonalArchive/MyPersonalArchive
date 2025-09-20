import { PropsWithChildren } from "react";
import { useTagsPrefetching } from "../Utils/useTagsPrefetching";
import { useUnallocatedBlobsPrefetching } from "../Utils/useUnallocatedBlobsPrefetching";
import { useLabelsPrefetching } from "../Utils/useLabelsPrefetching";


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
    useTagsPrefetching()
    useUnallocatedBlobsPrefetching()
    useLabelsPrefetching()

    return <>
        {children}
    </>
}