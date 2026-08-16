import React, { useState } from "react"


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
						/*canMovePrevious*/ (() => maximizedIndex !== undefined && maximizedIndex > 0)(),
						/*canMoveNext*/ (() => maximizedIndex !== undefined && maximizedIndex < items.length - 1)(),
						/*movePrevious*/ () => {
							if (maximizedIndex !== undefined && maximizedIndex > 0) {
								setMaximizedIndex(maximizedIndex - 1)
							}
						},
						/*moveNext*/ () => {
							if (maximizedIndex !== undefined && maximizedIndex < items.length - 1) {
								setMaximizedIndex(maximizedIndex + 1)
							}
						}
					)}
				</>
			}
		</>
	)
}
