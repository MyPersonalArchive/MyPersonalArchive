import {faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import React, {useState } from "react"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import classNames from "classnames"
import { ServerViewer } from "./Viewers/ServerViewer"


export enum DimensionEnum {
	thumbnail = 1,
	small = 2,
	full = 3
}

export interface BlobIdAndNumberOfPages {
	id: number
	numberOfPages?: number
	mimeType?: string
}


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
			<div className={classNames("previewlist ", containerClassName)} style={containerStyle}>
				{
					items.map(blob => thumbnailPreviewTemplate(blob, setMaximizedItem))
				}
			</div>
			{
				maximizedItem !== undefined && <>
					<div className="overlay-backdrop z-10" onClick={() => setMaximizedItem(undefined)}>
						<div className="overlay border border-gray-300 rounded-lg" onClick={event => event.stopPropagation()}>
							{
								maximizedPreviewTemplate(maximizedItem, () => setMaximizedItem(undefined))
							}
						</div>
					</div>
				</>
			}
		</>
	)
}


type PreviewProps<T extends BlobIdAndNumberOfPages> = {
	blob: T
	dimension: DimensionEnum
	onMaximize?: (blob: T) => void
	onMinimize?: () => void
	onRemove?: (blob: T) => void
}
export const Preview = <T extends BlobIdAndNumberOfPages,>({ blob, dimension, onMaximize, onMinimize, onRemove }: PreviewProps<T>) => {

	const controls = () => {
		return (
			<>
			{onMaximize && (
				<button type="button" onClick={() => onMaximize!(blob)} title="Expand">
				<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
				</button>
			)}
			{onMinimize && (
				<button type="button" onClick={() => onMinimize!()} title="Minimize">
				<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
				</button>
			)}
			{onRemove && (
				<button type="button" onClick={() => onRemove!(blob)} title="Delete">
				<FontAwesomeIcon icon={faTrash} size="1x" />
				</button>
			)}
			</>
		)
	}
	return (
		<>
			{
				<ServerViewer 
					blobId={blob.id} 
					dimension={dimension}
					mimeType={blob.mimeType}> 
					{controls()}
				</ServerViewer>
			}
		</>
	)
}