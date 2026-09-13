// LocalViewer.tsx
import { useEffect, useMemo } from "react"
import { BaseViewer } from "./BaseViewer"

type LocalViewerProps = {
	blob: Blob
}
export const LocalViewer = ({ blob }: LocalViewerProps) => {
	const url = useMemo(
		() => URL.createObjectURL(blob)
		, [blob]
	)

	useEffect(
		() => {
			return () => URL.revokeObjectURL(url)	// dispose function to release the object URL
		}, [url])

	return <BaseViewer
		url={url}
		mimeType={blob.type}
	/>
}
