import { PropsWithChildren } from "react"
import { EscapeKey, useKeyboardShortcut } from "../Utils/Hooks/useKeyboardShortcut"


export type Props = {
	onClose: () => void
	closeOnEscape?: boolean
	className?: string
}
export const Modal = ({ children, onClose, closeOnEscape = true, className }: PropsWithChildren<Props>) => {
	useKeyboardShortcut(EscapeKey, () => { onClose() }, closeOnEscape)

	return (
		<div className={className}
			role="presentation"
			onClick={e => { if (closeOnEscape) onClose(); e.stopPropagation() }}
		>
			{children}
		</div>
	)
}
