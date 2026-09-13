import { useMemo, useEffect, useRef, useState } from "react"


type BaseViewerProps = {
	url?: string
	mimeType?: string
	forceImageViewer?: boolean
}
export const BaseViewer = ({ url, mimeType, forceImageViewer }: BaseViewerProps) => {
	const isTextType = (mimeType: string): boolean => {
		return mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "application/xml"
	}

	if (!mimeType) return <div>Unknown file type</div>
	if (!url) return <div>No file specified</div>

	return (
		<div className="baseviewer w-full h-full max-w-full max-h-full">
			{
				(forceImageViewer || mimeType?.startsWith("image/")) ? (
					<ImageViewer url={url} />
				) : isTextType(mimeType!) ? (
					<TextViewer url={url} />
				) : mimeType === "application/pdf" ? (
					<PdfViewer url={url} />
				) : (
					<div>Preview not supported</div>
				)
			}
		</div>
	)
}


type ImageViewerProps = {
  url: string;
}
const ImageViewer = ({ url }: ImageViewerProps) => {
	return (
		<img
			src={url}
			alt="Preview"
			className="object-contain w-full h-full"
		/>
	)
}


type TextViewerProps = {
  url: string;
}
const TextViewer = ({ url }: TextViewerProps) => {
	const [text, setText] = useState<string>("")
	const [fontSize, setFontSize] = useState<number>(16)
	const containerRef = useRef<HTMLDivElement>(null)
	const textRef = useRef<HTMLPreElement>(null)

	useEffect(() => {
		fetch(url)
			.then((r) => r.text())
			.then(setText)
			.catch(() => setText("Failed to load text file."))
	}, [url])

	useEffect(() => {
		if (!text || !containerRef.current || !textRef.current) return

		const container = containerRef.current
		const pre = textRef.current

		let newSize = fontSize
		const maxSize = 24
		const minSize = 8

		// Reset to base size before measuring
		pre.style.fontSize = `${maxSize}px`

		//Dynamically adjust fontsize depending on the size of the container
		const adjustFont = () => {
			while (
				(pre.scrollHeight > container.clientHeight ||
          			pre.scrollWidth > container.clientWidth) && newSize > minSize
			) {
				newSize -= 1
				pre.style.fontSize = `${newSize}px`
			}
			setFontSize(newSize)
		}

		adjustFont()
	}, [text])

	if (!text) return <div>Loading...</div>

	return (
		<div
	  		className="text-viewer-container w-full h-full relative overflow-hidden"
			ref={containerRef}
		>
			<pre
				ref={textRef}
				style={{
					fontSize: `${fontSize}px`,
					whiteSpace: "pre-wrap",
					wordWrap: "break-word",
					padding: "1rem",
					background: "#f9f9f9",
					borderRadius: "0.5rem",
					margin: 0,
					width: "100%",
					height: "100%",
					boxSizing: "border-box",
				}}
			>
				{text}
			</pre>
		</div>
	)
}


type PdfViewerProps = {
	url: string
}
const PdfViewer = ({ url }: PdfViewerProps) => {
	const isFirefox = useMemo(() => {
		return navigator.userAgent.toLowerCase().indexOf("firefox") > -1
	}, [])

	// Firefox gets simpler parameters, other browsers get full control
	const pdfSrc = isFirefox
		? `${url}#zoom=30`
		: `${url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`

	return (
		<div className="pdf-viewer-container">
			<embed
				src={pdfSrc}
				type="application/pdf"
				className="w-full h-full"
			/>
		</div>
	)
}