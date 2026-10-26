import { useCallback, useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"


type Props = {
	url: string
	/**
	 * Size of the image the overlay coordinates refer to. When omitted the image is still shown,
	 * but no overlay slot is rendered.
	 */
	width?: number
	height?: number
	children?: ReactNode
}

type Frame = {
	left: number
	top: number
	width: number
	height: number
}

/**
 * Shows an image and draws `children` in the image's own coordinate space, regardless of how the
 * image is scaled or letterboxed inside the available area.
 */
export const OcrImageFrame = ({ url, width, height, children }: Props) => {
	const containerRef = useRef<HTMLDivElement>(null)
	const imageRef = useRef<HTMLImageElement>(null)
	const [frame, setFrame] = useState<Frame>()

	const measure = useCallback(() => {
		const container = containerRef.current
		const image = imageRef.current
		if (!container || !image || !image.naturalWidth || !image.naturalHeight) {
			return
		}

		const box = container.getBoundingClientRect()
		const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight)
		const renderedWidth = image.naturalWidth * scale
		const renderedHeight = image.naturalHeight * scale

		setFrame({
			left: (box.width - renderedWidth) / 2,
			top: (box.height - renderedHeight) / 2,
			width: renderedWidth,
			height: renderedHeight
		})
	}, [])

	useEffect(() => {
		measure()

		if (imageRef.current?.complete) {
			measure()
		}

		const container = containerRef.current
		if (!container) {
			return
		}

		const observer = new ResizeObserver(() => measure())
		observer.observe(container)

		return () => observer.disconnect()
	}, [measure, url])

	const hasOverlay = children !== undefined && width !== undefined && height !== undefined && frame !== undefined

	return (
		<div ref={containerRef} className="relative w-full h-full">
			<img
				ref={imageRef}
				src={url}
				alt="Preview"
				className="object-contain w-full h-full"
				onLoad={measure}
			/>
			{hasOverlay &&
				<svg
					className="absolute pointer-events-none"
					style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
					viewBox={`0 0 ${width} ${height}`}
					preserveAspectRatio="none"
				>
					{children}
				</svg>
			}
		</div>
	)
}
