import { CSSProperties, useEffect, useState } from "react";

interface Props {
  src: string
  style?: CSSProperties
}

export const PdfViewer = ({ src, style }: Props) => {
  const [isFirefox, setIsFirefox] = useState(false);

  useEffect(() => {
    setIsFirefox(navigator.userAgent.toLowerCase().indexOf('firefox') > -1);
  }, []);

  // Firefox gets simpler parameters, other browsers get full control
  const pdfSrc = isFirefox 
    ? `${src}#zoom=30`
    : `${src}#view=FitH&toolbar=0&navpanes=0&scrollbar=0&zoom=page-fit`;
  
	return (
		<div className="pdf-viewer-container">
			<iframe
			src={pdfSrc}
			title="File Preview"
			style={{
				width: "100%",
				height: "100%",
				border: "none",
				borderRadius: "0.5rem",
				// Firefox gets minimal styling to avoid conflicts
				...(isFirefox && {
				maxWidth: "100%",
				objectFit: "contain"
				}),
				...style,
			}}
			/>
	  </div>
  )
}