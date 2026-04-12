import React, {useState } from "react"


type PreviewListProps<T> = {
	items: T[]
	keySelector: (item: T) => string | number
	containerStyle?: React.CSSProperties
	containerClassName?: string
	thumbnailPreviewTemplate: (blob: T, setMaximizeBlob: (blob?: T) => void) => React.ReactNode
	maximizedPreviewTemplate: (blob: T, minimize: () => void) => React.ReactNode
}
export const PreviewList = <T,>({ items, keySelector, containerStyle, containerClassName, thumbnailPreviewTemplate, maximizedPreviewTemplate }: PreviewListProps<T>) => {
	const [maximizedItemKey, setMaximizedItemKey] = useState<string | number | undefined>()

	const maximizedItem = maximizedItemKey !== undefined
		? items.find(item => keySelector(item) === maximizedItemKey)
		: undefined

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				{
					items.map(blob => thumbnailPreviewTemplate(blob, (item) => setMaximizedItemKey(item ? keySelector(item) : undefined)))
				}
			</div>
			{
				maximizedItem !== undefined && <>
					{maximizedPreviewTemplate(maximizedItem, () => setMaximizedItemKey(undefined))}
				</>
			}
		</>
	)
}
