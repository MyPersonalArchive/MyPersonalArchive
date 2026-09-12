import { BaseViewer } from "./BaseViewer"
import { DimensionEnum } from "../../types/DimensionEnum"
import { UUID } from "crypto"

type Props = {
	blobId: UUID
	mimeType: string
	dimension: DimensionEnum
}
export const ServerViewer = ({ blobId, mimeType, dimension }: Props) => {
	// Check if we should force image viewer for PDF thumbnails/small sizes
	const shouldForceImageViewer = mimeType === "application/pdf" && (dimension === DimensionEnum.thumbnail || dimension === DimensionEnum.small)

	return <BaseViewer
		url={`/api/blob/GetFile?blobId=${blobId}&dimension=${dimension}&inline=true`}
		mimeType={mimeType}
		forceImageViewer={shouldForceImageViewer}
	/>
}
