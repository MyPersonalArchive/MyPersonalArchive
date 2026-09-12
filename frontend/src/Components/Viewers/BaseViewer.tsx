import { ImageViewer } from "./ImageViewer"
import { PdfViewer } from "./PdfViewer"
import { TextViewer } from "./TextViewer"


type BaseViewerProps = {
	srcData?: string
	mimeType?: string
	forceImageViewer?: boolean
}
export const BaseViewer = ({ srcData, mimeType, forceImageViewer }: BaseViewerProps) => {
	const isTextType = (mimeType: string): boolean => {
		return mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml"
	}

	if (!mimeType) return <div>Unknown file type</div>
	if (!srcData) return <div>No file specified</div>

	return (
		<div className="baseviewer w-full h-full max-w-full max-h-full">
			{
				(forceImageViewer || mimeType?.startsWith("image/")) ? (
					<ImageViewer src={srcData} />
				) : isTextType(mimeType!) ? (
					<TextViewer src={srcData} />
				) : mimeType === "application/pdf" ? (
					<PdfViewer src={srcData} />
				) : (
					<div>Preview not supported</div>
				)
			}
		</div>
	)
}
