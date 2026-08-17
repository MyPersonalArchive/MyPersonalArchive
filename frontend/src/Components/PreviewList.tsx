import React, { useEffect, useState } from "react"


type PreviewListProps<T> = {
	items: T[]
	keySelector: (item: T) => string | number
	containerStyle?: React.CSSProperties
	containerClassName?: string
	thumbnailPreviewTemplate: (
		blob: T,
		setMaximizeBlob: (blob?: T) => void
	) => React.ReactNode
	maximizedPreviewTemplate: (blob: T,
		minimize: () => void,
		canMovePrevious: boolean,
		canMoveNext: boolean,
		movePrevious: () => void,
		moveNext: () => void
	) => React.ReactNode
}
export const PreviewList = <T,>({ items, containerStyle, containerClassName, thumbnailPreviewTemplate, maximizedPreviewTemplate }: PreviewListProps<T>) => {
	const [maximizedIndex, setMaximizedIndex] = useState<number | undefined>(undefined)

	const canMovePrevious = maximizedIndex !== undefined && maximizedIndex > 0
	const canMoveNext = maximizedIndex !== undefined && maximizedIndex < items.length - 1

	const movePrevious = () => {
		if (maximizedIndex !== undefined && maximizedIndex > 0) {
			setMaximizedIndex(maximizedIndex - 1)
		}
	}
	const moveNext = () => {
		if (maximizedIndex !== undefined && maximizedIndex < items.length - 1) {
			setMaximizedIndex(maximizedIndex + 1)
		}
	}

	useEffect(() => {
		if (maximizedIndex === undefined) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft") movePrevious()
			else if (e.key === "ArrowRight") moveNext()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [maximizedIndex, items.length])

	const maximizedItem = maximizedIndex !== undefined
		? items[maximizedIndex]
		: undefined

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				{
					items.map((blob, index) => thumbnailPreviewTemplate(blob, (item) => setMaximizedIndex(item ? index : undefined)))
				}
			</div>
			{
				maximizedItem !== undefined && <>
					{maximizedPreviewTemplate(
						maximizedItem,
						/*minimize*/ () => setMaximizedIndex(undefined),
						canMovePrevious,
						canMoveNext,
						movePrevious,
						moveNext
					)}
				</>
			}
		</>
	)
}
