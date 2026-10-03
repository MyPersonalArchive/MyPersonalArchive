import React, { useState } from "react"
import { LeftKey, RightKey, useKeyboardShortcut } from "../Utils/Hooks/useKeyboardShortcut"
import { useNextAndPreviousNavigation } from "../Utils/Hooks/useNextAndPreviousNavigation"


type Props<T> = {
	items: T[]
	thumbnailPreviewTemplate: (
		item: T,
		setMaximizeBlob: (blob?: T) => void
	) => React.ReactNode
	maximizedPreviewTemplate: (
		item: T,
		minimize: () => void,
		canMovePrevious: boolean,
		canMoveNext: boolean,
		movePrevious: () => void,
		moveNext: () => void
	) => React.ReactNode
}
export const PreviewList = <T,>({ items, thumbnailPreviewTemplate, maximizedPreviewTemplate }: Props<T>) => {
	const {
		canMovePrevious,
		canMoveNext,
		movePrevious,
		moveNext,
		currentItem,
		setCurrentItem
	} = useNextAndPreviousNavigation(items)

	const minimize = () => setCurrentItem(undefined)

	useKeyboardShortcut(LeftKey, () => movePrevious(), canMovePrevious)
	useKeyboardShortcut(RightKey, () => moveNext(), canMoveNext)

	return (
		<>
			{
				items.map((item) => thumbnailPreviewTemplate(item, () => setCurrentItem(item)))
			}
			{
				currentItem !== undefined && <>
					{maximizedPreviewTemplate(
						currentItem,
						minimize,
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