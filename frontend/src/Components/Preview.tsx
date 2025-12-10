import { faUpRightAndDownLeftFromCenter, faDownLeftAndUpRightToCenter } from "@fortawesome/free-solid-svg-icons"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
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


export type PreviewProps<T extends BlobIdAndNumberOfPages> = {
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
		<ServerViewer
			blobId={blob.id}
			dimension={dimension}
			mimeType={blob.mimeType}>
			{controls()}
		</ServerViewer>
	)
}
