import { Dialog } from "./Dialog"


type ConfirmationDialogProps = {
	open: boolean
	prompt: string
	onClose: () => void
	onConfirm: () => void
}
export const ConfirmationDialog = ({ open, prompt, onClose, onConfirm }: ConfirmationDialogProps) => {
	return (
		<>
			{open &&
				<Dialog size="medium"
					onClose={onClose}
					closeOnEscape={true}
				>
					<div className="dialog-header">
						{prompt}
					</div>
					<div className="stack-horizontal to-the-right p-4">
						<button className="btn" type="button" onClick={onClose}>Cancel</button>
						<button className="btn btn-danger" type="button" onClick={e => { e.preventDefault(); onConfirm() }}>Delete</button>
					</div>
				</Dialog>
			}
		</>
	)
}