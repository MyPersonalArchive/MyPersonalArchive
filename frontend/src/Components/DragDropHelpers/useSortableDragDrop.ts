import { useEffect, useRef, useState } from "react"
import { DispatchFn, MimeTypeConverterArray, Row } from "./types"
import { JsonStringifyIfNotString } from "./helpers"
import { insertAtIndex, removeAtIndex } from "../../Utils/array-helpers"

type DragStatus = {
	fromIndex?: number
	currentIndex?: number
	isDragHandle: boolean
}

const emptyDragOverStatus: DragStatus = { fromIndex: undefined, currentIndex: undefined, isDragHandle: false }


export const useSortableDragDrop = <TData, THtmlElement extends HTMLElement>(
	dragHandleQuerySelector: string,
	mimeTypeConverters: MimeTypeConverterArray<TData, number>,
	items: Array<TData>,
	dispatch: DispatchFn
) => {
	const [dragStatus, setDragStatus] = useState<DragStatus>(emptyDragOverStatus)
	const draggables = useRef<(THtmlElement | null)[]>([])

	const droppableTypeConverters = mimeTypeConverters.filter(mimeTypeConverter => typeof mimeTypeConverter.convertDropPayloadToAction === "function")

	useEffect(() => {
		draggables.current = draggables.current.slice(0, items.length)
	}, [items.length])


	let rows: Row<TData>[] = items.map((item, index) => ({ rowType: "item-row", index, data: item, key: index }))

	if (dragStatus.fromIndex !== undefined && dragStatus.currentIndex !== undefined) {
		// While in a drag-n-drop: remove the item that is currently being dragged from the list and insert a "drop row" at the position of the current drag over index
		const { data } = rows[dragStatus.fromIndex]
		rows = removeAtIndex(rows, dragStatus.fromIndex)
		rows = insertAtIndex(rows, dragStatus.currentIndex, { rowType: "drop-row", data, key: dragStatus.currentIndex })
	}



	const setElementRef = (elmnt: THtmlElement | null, index: number) => draggables.current[index] = elmnt

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

	const dragStart = (index: number, data: TData) => (event: React.DragEvent) => {
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

	const dragOver = (index: number) => (event: React.DragEvent) => {
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

	const handleDrop = (toIndex: number) => (event: React.DragEvent) => {
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
		handleDrop,
		rows
	}
}
