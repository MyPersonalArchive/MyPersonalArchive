import { PropsWithChildren } from "react"
import { Modal } from "./Modal"


type LightBoxProps = {
	onClose: () => void
	closeOnEscape?: boolean
	className?: string
}
export const LightBox = ({ children, onClose, closeOnEscape = true, className }: PropsWithChildren<LightBoxProps>) => {

	return (
		<Modal onClose={onClose} closeOnEscape={closeOnEscape} className={`lightbox-backdrop ${className}`}>
			{children}
		</Modal>
	)
}
