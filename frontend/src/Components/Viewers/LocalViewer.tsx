// LocalViewer.tsx
import { PropsWithChildren, useEffect, useMemo } from "react"
import { BaseViewer } from "./BaseViewer"

type LocalViewerProps = {
	blob: Blob
}
export const LocalViewer = ({ blob }: PropsWithChildren<LocalViewerProps>) => {
	const srcData = useMemo(() => {
		const blobUrl = URL.createObjectURL(blob)
		return blobUrl
	}, [blob])

	useEffect(() => {
		return () => URL.revokeObjectURL(srcData)
	}, [srcData])

	return <BaseViewer
		srcData={srcData}
		mimeType={blob.type}
	/>
}
