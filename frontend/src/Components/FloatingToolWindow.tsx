import { PropsWithChildren, useEffect, useId, useRef } from "react"
import { faClose } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import classNames from "classnames"


type Position = { x: number; y: number }
type Size = { width: number; height: number }

const HEADER_VISIBLE_MARGIN = 40

type FloatingToolWindowProps = {
	title: React.ReactNode
	onClose?: () => void
	closeOnEscape?: boolean
	initialPosition?: Position
	initialSize?: Size
	minWidth?: number
	minHeight?: number
	className?: string
}
export const FloatingToolWindow = ({
	children,
	title,
	onClose,
	closeOnEscape = false,
	initialPosition = { x: 120, y: 100 },
	initialSize = { width: 480, height: 320 },
	minWidth = 240,
	minHeight = 160,
	className,
}: PropsWithChildren<FloatingToolWindowProps>) => {
	const windowRef = useRef<HTMLDivElement>(null)
	const positionRef = useRef<Position>(initialPosition)
	const sizeRef = useRef<Size>(initialSize)
	const titleId = useId()

	useEffect(() => {
		if (!closeOnEscape) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose?.()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [onClose, closeOnEscape])

	const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!e.isPrimary) return
		if ((e.target as HTMLElement).closest("button")) return // let header buttons (e.g. close) handle their own click instead of starting a drag
		e.preventDefault()

		const header = e.currentTarget
		header.setPointerCapture(e.pointerId)

		const startX = e.clientX
		const startY = e.clientY
		const startPosition = { ...positionRef.current }
		const width = windowRef.current?.offsetWidth ?? 0

		const onPointerMove = (e: PointerEvent) => {
			const nextX = startPosition.x + (e.clientX - startX)
			const nextY = startPosition.y + (e.clientY - startY)
			const clamped: Position = {
				x: Math.min(Math.max(nextX, HEADER_VISIBLE_MARGIN - width), window.innerWidth - HEADER_VISIBLE_MARGIN),
				y: Math.min(Math.max(nextY, 0), window.innerHeight - HEADER_VISIBLE_MARGIN)
			}
			positionRef.current = clamped
			if (windowRef.current) {
				windowRef.current.style.left = `${clamped.x}px`
				windowRef.current.style.top = `${clamped.y}px`
			}
		}
		const onPointerUp = () => {
			header.removeEventListener("pointermove", onPointerMove)
			header.removeEventListener("pointerup", onPointerUp)
		}
		header.addEventListener("pointermove", onPointerMove)
		header.addEventListener("pointerup", onPointerUp)
	}

	const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (!e.isPrimary) return
		e.preventDefault()

		const handle = e.currentTarget
		handle.setPointerCapture(e.pointerId)

		const startX = e.clientX
		const startY = e.clientY
		const startSize = { ...sizeRef.current }

		const onPointerMove = (e: PointerEvent) => {
			const next: Size = {
				width: Math.max(minWidth, startSize.width + (e.clientX - startX)),
				height: Math.max(minHeight, startSize.height + (e.clientY - startY))
			}
			sizeRef.current = next
			if (windowRef.current) {
				windowRef.current.style.width = `${next.width}px`
				windowRef.current.style.height = `${next.height}px`
			}
		}
		const onPointerUp = () => {
			handle.removeEventListener("pointermove", onPointerMove)
			handle.removeEventListener("pointerup", onPointerUp)
		}
		handle.addEventListener("pointermove", onPointerMove)
		handle.addEventListener("pointerup", onPointerUp)
	}

	return (
		<div ref={windowRef}
			className="floating-window"
			role="dialog"
			aria-labelledby={titleId}
			style={{
				left: initialPosition.x,
				top: initialPosition.y,
				width: initialSize.width,
				height: initialSize.height
			}}
			onClick={e => e.stopPropagation()}
		>
			<div className="floating-window-header" id={titleId} onPointerDown={handleHeaderPointerDown}>
				<span>{title}</span>
				
				{onClose && (
					<button className="floating-window-close" type="button" aria-label="Close" title="Close" onClick={onClose}>
						<FontAwesomeIcon icon={faClose} />
					</button>
				)}
			</div>

			<div className={classNames("floating-window-content", className)}>
				{children}
			</div>

			<div className="floating-window-resize-handle" onPointerDown={handleResizePointerDown} />
		</div>
	)
}
