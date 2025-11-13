import { useEffect, useState } from "react"
import { useApiClient } from "../../Utils/useApiClient"
import { BaseViewer, BaseViewerProps } from "./BaseViewer"
import { DimensionEnum } from "../PreviewList"

interface Props extends BaseViewerProps {
	blobId: number
}

export const ServerViewer = ({ blobId, mimeType, dimension, children }: Props) => {
	const apiClient = useApiClient()
	const [srcData, setSrcData] = useState<string>("")
	const [loading, setLoading] = useState(true)
  
	// Check if we should force image viewer for PDF thumbnails/small sizes
	const shouldForceImageViewer = mimeType === "application/pdf" && 
    (dimension === DimensionEnum.thumbnail || dimension === DimensionEnum.small)

	useEffect(() => {
		let cancelled = false

		const fetchFile = async () => {
			try {
				const response = await apiClient.getBlob(`/api/blob/GetFile?blobId=${blobId}&dimension=${dimension}`, {})
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
		src={srcData} 
		mimeType={mimeType} 
		dimension={dimension} 
		forceImageViewer={shouldForceImageViewer}
		children={children} 
	/>
}
