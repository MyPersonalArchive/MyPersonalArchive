import { useEffect, useRef, useState } from "react"
import { DispatchFn, DropFn, MimeTypeConverterArray } from "./types"
import { JsonStringifyIfNotString } from "./helpers"

type DragStatus<TIndex> = {
    fromIndex?: TIndex
    currentIndex?: TIndex
    isDragHandle: boolean
}

const emptyDragOverStatus: DragStatus<any> = { fromIndex: undefined, currentIndex: undefined, isDragHandle: false }


export const useSortableDragDrop = <TData, TIndex>(
	dragHandleQuerySelector: string,
	mimeTypeConverters: MimeTypeConverterArray<TData, TIndex>,
	elementCount: number,
	dispatch: DispatchFn
) => {
	const [dragStatus, setDragStatus] = useState<DragStatus<TIndex>>(emptyDragOverStatus)
	const draggables = useRef<(HTMLTableRowElement | null)[]>([])

	const droppableTypeConverters = mimeTypeConverters.filter(mimeTypeConverter => typeof mimeTypeConverter.convertDropPayloadToAction === "function")

	useEffect(() => {
		draggables.current = draggables.current.slice(0, elementCount)
	}, [elementCount])

	const setElementRef = (elmnt: HTMLTableRowElement | null, index: number) => draggables.current[index] = elmnt

	// --- Drag and Drop ---
	const mouseDown = (event: React.MouseEvent) => {
		const target = event.target as Element
		const isDragHandle = Array.from(draggables.current!)
			.flatMap(draggable => Array.from(draggable!.querySelectorAll(dragHandleQuerySelector)))
			.some(handle => handle.contains(target))

		setDragStatus({
			...dragStatus,
			isDragHandle
		})
	}

	const mouseUp = (event: React.MouseEvent) => {
		setDragStatus(emptyDragOverStatus)
	}

	const dragStart = (index: TIndex, data: TData) => (event: React.DragEvent) => {
		if (!dragStatus.isDragHandle) {
			event.preventDefault()
			return
		}
		event.stopPropagation()

		setDragStatus({
			...dragStatus,
			fromIndex: index,
			currentIndex: undefined,
		})

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
		setDragStatus(emptyDragOverStatus)
		event.currentTarget.classList.remove("dragging")
	}

	const dragOver = (index: TIndex) => (event: React.DragEvent) => {
		event.preventDefault()
		event.stopPropagation()

		setDragStatus({
			...dragStatus,
			currentIndex: index
		})

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

				dispatch(action)
			})
	}

	return {
		setElementRef,
		dragStatus,
		mouseDown,
		mouseUp,
		dragStart,
		dragEnd,
		dragOver,
		handleDrop
	}
}
