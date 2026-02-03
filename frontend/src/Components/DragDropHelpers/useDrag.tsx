import React from "react"
import { MimeTypeConverterArray } from "./types"
import { JsonStringifyIfNotString } from "./helpers"

export const useDrag = <TData, TIndex>(
    mimeTypeConverters: MimeTypeConverterArray<TData, TIndex>
) => {
    const dragStart = (index: TIndex, data: TData) => (event: React.DragEvent) => {
        event.stopPropagation()

        mimeTypeConverters
            .filter(converter => typeof converter.convertDragDataToPayload === "function")
            .forEach(converter => {
                event.dataTransfer.setData(converter.mimeType, JsonStringifyIfNotString(converter.convertDragDataToPayload!(data, index)))
            })

        event.dataTransfer.effectAllowed = "move"
        const x = event.clientX - event.currentTarget.getBoundingClientRect().left
        event.dataTransfer.setDragImage(event.currentTarget, x, event.currentTarget.clientHeight / 2)
        event.currentTarget.classList.add("dragging")
    }

    const dragEnd = (event: React.DragEvent) => {
        event.currentTarget.classList.remove("dragging")
    }

    return {
        dragStart,
        dragEnd
    }
}
