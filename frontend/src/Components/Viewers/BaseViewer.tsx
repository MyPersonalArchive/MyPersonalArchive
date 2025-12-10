// ViewerCore.tsx
import { CSSProperties, ReactNode } from "react"
import { ImageViewer } from "./ImageViewer"
import { PdfViewer } from "./PdfViewer"
import { TextViewer } from "./TextViewer"
import { DimensionEnum } from "../Preview"

export interface BaseViewerProps {
  src?: string
  mimeType?: string
  dimension: DimensionEnum
  forceImageViewer?: boolean
  children?: ReactNode,
}

export const BaseViewer = ({ src, mimeType, dimension, forceImageViewer, children }: BaseViewerProps) => {
	const isTextType = (mimeType: string): boolean =>{
		return mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml"
	}

	if (!mimeType) return <div>Unknown file type</div>
	if (!src) return <div>File not available</div>

	// Calculate responsive dimensions based on DimensionEnum
	const getDimensions = (): CSSProperties => {
		switch (dimension) {
			case DimensionEnum.thumbnail:
				return {
					// width: "130px",
					// height: "160px",
					maxWidth: "100%",
					maxHeight: "100%"
				}
			case DimensionEnum.small:
				return {
					width: "220px",
					height: "29vh",
					maxWidth: "100%",
					maxHeight: "100%"
				}
			case DimensionEnum.full:
				return {
					width: "80vw",
					height: "80vh",
					maxWidth: "90vw",
					maxHeight: "90vh"
				}
			default:
				return { width: "100%", height: "100%" }
		}
	}

	const viewerStyle: CSSProperties = { width: "100%", height: "100%" }

	let viewer: ReactNode

	// Force ImageViewer if requested (e.g., for PDF previews that are actually images)
	if (forceImageViewer || mimeType?.startsWith("image/")) viewer = <ImageViewer src={src} style={viewerStyle} />
	else if (isTextType(mimeType!)) viewer = <TextViewer src={src} style={viewerStyle} />
	else if (mimeType === "application/pdf") viewer = <PdfViewer src={src} style={viewerStyle} />
	else viewer = <div>Preview not supported</div>

	return (
		<div className="preview" style={getDimensions()}>
			{viewer}
			{children && (
				<div className="action-bar">
					{children}
				</div>
			)}
		</div>
	)
}
