import { PropsWithChildren, useEffect } from "react"


export type ModalProps = {
	onClose: () => void
	closeOnEscape?: boolean
	className?: string
}
export const Modal = ({ children, onClose, closeOnEscape = true, className }: PropsWithChildren<ModalProps>) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && closeOnEscape) onClose()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [onClose, closeOnEscape])

	return (
		<div className={className}
			role="presentation"
			onClick={e => { if (closeOnEscape) onClose(); e.stopPropagation() }}
		>
			{children}
		</div>
	)
}
