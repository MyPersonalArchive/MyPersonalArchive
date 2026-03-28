import { PropsWithChildren } from "react"
import { Modal } from "./Modal"


type LightBoxProps = {
	onClose: () => void
	closeOnEscape?: boolean
}
export const LightBox = ({ children, onClose, closeOnEscape = true }: PropsWithChildren<LightBoxProps>) => {
	return (
		<Modal onClose={onClose} closeOnEscape={closeOnEscape} className="lightbox-backdrop">
			{children}
		</Modal>
	)
}
