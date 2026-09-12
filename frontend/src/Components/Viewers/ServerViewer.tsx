import { useEffect, useState } from "react"
import { useApiClient } from "../../Utils/Hooks/useApiClient"
import { BaseViewer } from "./BaseViewer"
import { DimensionEnum } from "../../types/DimensionEnum"
import { UUID } from "crypto"

type Props = {
	blobId: UUID
	mimeType: string
	dimension: DimensionEnum
}
export const ServerViewer = ({ blobId, mimeType, dimension }: Props) => {
	const apiClient = useApiClient()
	const [srcData, setSrcData] = useState<string>("")
	const [loading, setLoading] = useState(true)

	// Check if we should force image viewer for PDF thumbnails/small sizes
	const shouldForceImageViewer = mimeType === "application/pdf" && (dimension === DimensionEnum.thumbnail || dimension === DimensionEnum.small)

	useEffect(() => {
		let cancelled = false

		const fetchFile = async () => {
			try {
				const response = await apiClient.getBlob("/api/blob/GetFile", { blobId, dimension })
				if (!cancelled) {
					const blobUrl = URL.createObjectURL(response.blob)
					setSrcData(blobUrl)
					setLoading(false)
				}
			} catch (err) {
				if (!cancelled) {
					console.error("Failed to fetch file", err)
					setLoading(false)
				}
			}
		}

		fetchFile()
		return () => {
			cancelled = true
			if (srcData) URL.revokeObjectURL(srcData)
		}
	}, [blobId])

	if (loading) return <div>Loading file...</div>

	return <BaseViewer
		srcData={srcData}
		mimeType={mimeType}
		forceImageViewer={shouldForceImageViewer}
	/>
}
