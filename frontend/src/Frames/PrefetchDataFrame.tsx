import { PropsWithChildren } from "react";
import { useTagsPrefetching } from "../Utils/useTagsPrefetching";


export const PrefetchDataFrame = ({ children }: PropsWithChildren) => {
    useTagsPrefetching()

    return <>
        {children}
    </>
}