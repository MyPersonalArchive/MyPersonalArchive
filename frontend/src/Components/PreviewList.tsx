import React, {useState } from "react"


type PreviewListProps<T> = {
	items: T[]
	containerStyle?: React.CSSProperties
	containerClassName?: string
	thumbnailPreviewTemplate: (blob: T, setMaximizeBlob: (blob?: T) => void) => React.ReactNode
	maximizedPreviewTemplate: (blob: T, minimize: () => void) => React.ReactNode
}
export const PreviewList = <T,>({ items, containerStyle, containerClassName, thumbnailPreviewTemplate, maximizedPreviewTemplate }: PreviewListProps<T>) => {
	const [maximizedItem, setMaximizedItem] = useState<T | undefined>()

	return (
		<>
			<div className={containerClassName} style={containerStyle}>
				{
					items.map(blob => thumbnailPreviewTemplate(blob, setMaximizedItem))
				}
			</div>
			{
				maximizedItem !== undefined && <>
					{/* <ModalDialog onClose={() => setMaximizedItem(undefined)}> */}
					{maximizedPreviewTemplate(maximizedItem, () => setMaximizedItem(undefined))}
					{/* </ModalDialog> */}
				</>
			}
		</>
	)
}
