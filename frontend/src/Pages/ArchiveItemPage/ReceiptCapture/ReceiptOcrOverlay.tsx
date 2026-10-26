import { useState } from "react"
import { hasLowConfidence, parseAmount } from "../../../Utils/OCR/ocrGeometry"
import type { OcrBbox, OcrLine, OcrPageLines, OcrWord } from "../../../Utils/OCR/ocrGeometry"


type Props = {
	page: OcrPageLines
	highlightedLineId?: string | null
	highlightedBbox?: OcrBbox | null
	selectedWordIds: string[]
	onLineClick: (line: OcrLine) => void
	onWordClick: (word: OcrWord) => void
}

const LINE_STROKE = "rgba(2, 132, 199, 0.20)"
const LINE_STROKE_ACTIVE = "rgba(2, 132, 199, 0.9)"
const LINE_HALO = "rgba(14, 165, 233, 0.05)"
const LINE_FILL = "rgba(14, 165, 233, 0.03)"
const LINE_FILL_ACTIVE = "rgba(14, 165, 233, 0.16)"
const UNCERTAIN_STROKE = "rgba(217, 119, 6, 0.8)"
const WORD_SELECTED_FILL = "rgba(45, 212, 191, 0.3)"
const WORD_SELECTED_STROKE = "rgba(13, 148, 136, 0.95)"

/**
 * Rendered inside the viewer's overlay svg, in the coordinate space of the recognised image.
 */
export const ReceiptOcrOverlay = ({ page, highlightedLineId, highlightedBbox, selectedWordIds, onLineClick, onWordClick }: Props) => {
	const [hoveredLineId, setHoveredLineId] = useState<string | null>(null)

	return (
		<>
			{page.lines.map(line => {
				const amount = parseAmount(line.text)
				const isActive = hoveredLineId === line.id || highlightedLineId === line.id
				const isUncertain = hasLowConfidence(line.confidence)
				const width = line.bbox.x1 - line.bbox.x0
				const height = line.bbox.y1 - line.bbox.y0

				return (
					<g key={line.id}
						onPointerEnter={() => setHoveredLineId(line.id)}
						onPointerLeave={() => setHoveredLineId(current => current === line.id ? null : current)}
					>
						{/* Halo keeps the click target visible on dark scans, the solid stroke on light ones. */}
						<rect
							x={line.bbox.x0}
							y={line.bbox.y0}
							width={width}
							height={height}
							vectorEffect="non-scaling-stroke"
							strokeWidth={isActive ? 4 : 3}
							stroke={LINE_HALO}
							fill="none"
							className="pointer-events-none"
						/>
						<rect
							x={line.bbox.x0}
							y={line.bbox.y0}
							width={width}
							height={height}
							vectorEffect="non-scaling-stroke"
							strokeWidth={isActive ? 1.75 : 1}
							stroke={isUncertain ? UNCERTAIN_STROKE : (isActive ? LINE_STROKE_ACTIVE : LINE_STROKE)}
							strokeDasharray={isUncertain ? "7 4" : undefined}
							fill={isActive ? LINE_FILL_ACTIVE : LINE_FILL}
							className="pointer-events-auto cursor-pointer transition-colors duration-150"
							onClick={event => { event.stopPropagation(); onLineClick(line) }}
						>
							<title>{amount === "" ? line.text : `${line.text} — ${amount}`}</title>
						</rect>

						{line.words.map(word => {
							const isSelected = selectedWordIds.includes(word.id)
							return (
								<rect
									key={word.id}
									x={word.bbox.x0}
									y={word.bbox.y0}
									width={word.bbox.x1 - word.bbox.x0}
									height={word.bbox.y1 - word.bbox.y0}
									vectorEffect="non-scaling-stroke"
									strokeWidth={1.5}
									stroke={isSelected ? WORD_SELECTED_STROKE : "transparent"}
									fill={isSelected ? WORD_SELECTED_FILL : "transparent"}
									className="pointer-events-auto cursor-pointer transition-colors duration-150 hover:fill-sky-500/35"
									onPointerEnter={() => setHoveredLineId(line.id)}
									onClick={event => { event.stopPropagation(); onWordClick(word) }}
								/>
							)
						})}
					</g>
				)
			})}

			{highlightedBbox &&
				<rect
					x={highlightedBbox.x0}
					y={highlightedBbox.y0}
					width={highlightedBbox.x1 - highlightedBbox.x0}
					height={highlightedBbox.y1 - highlightedBbox.y0}
					vectorEffect="non-scaling-stroke"
					strokeWidth={2.5}
					className="pointer-events-none fill-amber-400/30 stroke-amber-400"
				/>
			}
		</>
	)
}
