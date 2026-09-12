// LocalViewer.tsx
import { PropsWithChildren, useEffect, useMemo } from "react"
import { BaseViewer } from "./BaseViewer"

type LocalViewerProps = {
	blob: Blob
}
export const LocalViewer = ({ blob }: PropsWithChildren<LocalViewerProps>) => {
	const srcData = useMemo(
		() => URL.createObjectURL(blob)
		, [blob]
	)

	useEffect(
		() => {
			return () => URL.revokeObjectURL(srcData)	// dispose function to release the object URL
		}, [srcData])

	return <BaseViewer
		srcData={srcData}
		mimeType={blob.type}
	/>
}
