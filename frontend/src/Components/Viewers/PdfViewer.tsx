import { CSSProperties, useMemo } from "react"

interface Props {
  src: string
  style?: CSSProperties
}

export const PdfViewer = ({ src, style }: Props) => {
	const isFirefox = useMemo(() => {
		return navigator.userAgent.toLowerCase().indexOf("firefox") > -1
	}, [])

	// Firefox gets simpler parameters, other browsers get full control
	const pdfSrc = isFirefox 
		? `${src}#zoom=30`
		: `${src}#view=FitH&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`
  
	return (
		<div className="pdf-viewer-container">
			<embed
				src={pdfSrc}
				type="application/pdf"
				style={{ width: "100%", height: "100%", ...style }}
			/>
	  </div>
	)
}