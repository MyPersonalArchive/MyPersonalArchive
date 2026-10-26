import { OcrImageFrame } from "./OcrImageFrame"
import { ReceiptOcrOverlay } from "./ReceiptOcrOverlay"
import type { ReceiptCaptureState } from "./useReceiptCapture"


type Props = {
	url: string
	capture: ReceiptCaptureState
}

/**
 * The image with the detected text boxes drawn on top. The capture panel itself lives in the
 * quick edit tool window.
 */
export const OcrImageView = ({ url, capture }: Props) => {
	const pageLines = capture.pageLines

	return (
		<OcrImageFrame url={url} width={pageLines?.width} height={pageLines?.height}>
			{pageLines &&
				<ReceiptOcrOverlay
					page={pageLines}
					highlightedLineId={capture.highlightedLineId}
					highlightedBbox={capture.highlightedBbox}
					selectedWordIds={capture.selectedWords.map(word => word.id)}
					onLineClick={capture.addDetectedLine}
					onWordClick={capture.toggleWord}
				/>
			}
		</OcrImageFrame>
	)
}
