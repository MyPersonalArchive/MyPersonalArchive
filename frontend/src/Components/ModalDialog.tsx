import { PropsWithChildren, useEffect } from "react"


type ModalDialogProps = {
	onClose: () => void
	closeOnEscape?: boolean
	size?: "small" | "medium" | "large" | "full"
}
export const ModalDialog = ({ children, onClose, closeOnEscape = true, size = "medium" }: PropsWithChildren<ModalDialogProps>) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && closeOnEscape) onClose()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [onClose, closeOnEscape])

	return (
		<div className="dialog-backdrop open"
			id="dialogBackdrop"
			role="presentation"
			onClick={onClose}
		>
			<div className={`dialog ${size}`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialogTitle"
				onClick={e => e.stopPropagation()}
			>
				{children}
			</div>
		</div>
	)
}



export const DialogFooter = ({ children }: PropsWithChildren) => {
	return <div className="dialog-footer">{children}</div>
}

export const DialogHeader = ({ children }: PropsWithChildren) => {
	return <div className="dialog-header">{children}</div>
}

export const DialogContent = ({ children }: PropsWithChildren) => {
	return <div className="dialog-content">{children}</div>
}