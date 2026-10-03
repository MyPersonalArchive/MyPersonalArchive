import { useState } from "react"

export const useNextAndPreviousNavigation = <T,>(items: T[], initialItem?: T) => {
	// undefined = nothing selected yet (fall back to initialItem), null = explicitly cleared
	const [selectedIndex, setCurrentIndex] = useState<number | null>()

	const initialIndex = initialItem !== undefined ? items.indexOf(initialItem) : -1
	const currentIndex = selectedIndex === undefined
		? (initialIndex !== -1 ? initialIndex : undefined)
		: (selectedIndex ?? undefined)

	const canMovePrevious = currentIndex !== undefined && currentIndex > 0
	const canMoveNext = currentIndex !== undefined && currentIndex < items.length - 1

	const movePrevious = () => {
		if (currentIndex !== undefined && currentIndex > 0) {
			setCurrentIndex(currentIndex - 1)
		}
	}

	const moveNext = () => {
		if (currentIndex !== undefined && currentIndex < items.length - 1) {
			setCurrentIndex(currentIndex + 1)
		}
	}

	const setCurrentItem = (item: T | undefined) => {
		if (item === undefined) {
			setCurrentIndex(null)
		} else {
			const index = items.indexOf(item)
			if (index !== -1) {
				setCurrentIndex(index)
			}
		}
	}

	const currentItem = currentIndex !== undefined
		? items[currentIndex]
		: undefined
			
	return {
		canMovePrevious,
		canMoveNext,
		movePrevious,
		moveNext,
		currentItem,
		setCurrentItem
	}
}