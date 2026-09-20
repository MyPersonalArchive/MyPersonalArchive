// LocalViewer.tsx
import { useEffect, useMemo } from "react"
import { BaseViewer } from "./BaseViewer"

type Props = {
	blob: Blob
}
export const LocalViewer = ({ blob }: Props) => {
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
