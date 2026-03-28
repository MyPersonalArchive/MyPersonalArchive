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
}
export const Preview = <T extends BlobIdAndNumberOfPages,>({ blob, dimension }: PreviewProps<T>) => {
	return (
		<ServerViewer
			blobId={blob.id}
			dimension={dimension}
			mimeType={blob.mimeType}>
		</ServerViewer>
	)
}
