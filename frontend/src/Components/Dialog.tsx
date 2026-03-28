import { PropsWithChildren } from "react"
import { Modal } from "./Modal"


type DialogProps = {
	onClose: () => void
	closeOnEscape: boolean	// This also controls whether clicking on the backdrop closes the dialog
	size?: "small" | "medium" | "large" | "full"
}
export const Dialog = ({ children, onClose, closeOnEscape = true, size = "medium" }: PropsWithChildren<DialogProps>) => {
	return (
		<Modal onClose={onClose} closeOnEscape={closeOnEscape} className="dialog-backdrop">
			<div className={`dialog ${size}`}
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

