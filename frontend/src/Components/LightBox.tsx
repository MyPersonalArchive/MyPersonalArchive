import { PropsWithChildren } from "react"
import { Modal } from "./Modal"


type Props = {
	onClose: () => void
	closeOnEscape?: boolean
}
export const LightBox = ({ children, onClose, closeOnEscape = true }: PropsWithChildren<Props>) => {
	return (
		<Modal onClose={onClose} closeOnEscape={closeOnEscape} className="lightbox-backdrop">
			{children}
		</Modal>
	)
}
