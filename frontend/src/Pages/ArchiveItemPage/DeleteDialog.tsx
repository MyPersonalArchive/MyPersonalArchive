import { Dialog } from "../../Components/Dialog"


type DeleteDialogProps = {
	open: boolean
	onClose: () => void
	onDelete: () => void
}
export const DeleteDialog = ({ open, onClose, onDelete }: DeleteDialogProps) => {
	return (
		<>
			{open &&
				<Dialog size="medium"
					onClose={onClose}
					closeOnEscape={true}
				>
					<div className="dialog-header">
						Are you sure you want to delete this item?
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