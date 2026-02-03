import React from "react"
import { DispatchFn, MimeTypeConverterArray } from "./types"


export const useDrop = <TData, TIndex>(
	mimeTypeConverters: MimeTypeConverterArray<TData, TIndex>,
	dispatchFn: DispatchFn
) => {
	const droppableTypeConverters = mimeTypeConverters.filter(mimeTypeConverter => typeof mimeTypeConverter.convertDropPayloadToAction === "function")

	const dragOver = (index: TIndex) => (event: React.DragEvent) => {
		event.preventDefault()
		event.stopPropagation()

		const converters = droppableTypeConverters
			.filter(droppableTypeConverter =>
				event.dataTransfer.types.some(transferType => droppableTypeConverter.mimeType === transferType)
			)

		if (converters.length > 0) {
			event.dataTransfer.dropEffect = "move"
		} else {
			event.dataTransfer.dropEffect = "none"
		}
	}

	const handleDrop = (toIndex: TIndex) => (event: React.DragEvent) => {
		event.preventDefault()

		droppableTypeConverters
			.filter(droppableTypeConverter =>
				event.dataTransfer.types.some(transferType => droppableTypeConverter.mimeType === transferType)
			)
			.slice(0, 1) // take only the first one
			.forEach(converter => {
				const rawData = JSON.parse(event.dataTransfer.getData(converter.mimeType))
				const fromIndex = rawData.index
				const action = converter.convertDropPayloadToAction!(fromIndex, toIndex, rawData)

				dispatchFn(action)
			})
	}

	return {
		dragOver,
		handleDrop
	}
}
