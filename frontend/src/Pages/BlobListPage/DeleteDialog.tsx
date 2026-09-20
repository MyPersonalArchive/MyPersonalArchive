import { Dialog } from "../../Components/Dialog"


type DeleteDialogProps = {
	open: boolean
	prompt: string
	onClose: () => void
	onDelete: () => void
}
export const DeleteDialog = ({ open, prompt, onClose, onDelete }: DeleteDialogProps) => {
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
						<button className="btn btn-danger" type="button" onClick={e => { e.preventDefault(); onDelete() }}>Delete</button>
					</div>
				</Dialog>
			}
		</>
	)
}