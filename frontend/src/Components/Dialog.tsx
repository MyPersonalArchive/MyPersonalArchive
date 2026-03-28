import { PropsWithChildren } from "react"
import { Modal } from "./Modal"
import classNames from "classnames"


type DialogProps = {
	onClose: () => void
	closeOnEscape: boolean	// This also controls whether clicking on the backdrop closes the dialog
	size?: "small" | "medium" | "large" | "full"
	className?: string
}
export const Dialog = ({ children, onClose, closeOnEscape = true, size = "medium", className }: PropsWithChildren<DialogProps>) => {
	return (
		<Modal onClose={onClose} closeOnEscape={closeOnEscape} className="dialog-backdrop">
			<div className={classNames("dialog", size, className)}
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialogTitle"
				onClick={e => e.stopPropagation() }
			>
				{children}
			</div>
		</Modal>
	)
}

