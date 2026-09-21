import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { SelectCheckbox, useSelection } from "../../Utils/Selection"
import { faPaperclip } from "@fortawesome/free-solid-svg-icons"
import { EmailAttachment, FullEmail } from "../../Utils/Atoms/EmailAtoms"
import { useEffect, useRef } from "react"


type Props = {
	attachments: EmailAttachment[]
	email: FullEmail
	externalAccountId: string
	selectedFolder: string
	ingestAttachments: (messageId: number, attachments: EmailAttachment[]) => void
}
export const AttachmentList = ({ attachments, email, externalAccountId, selectedFolder, ingestAttachments }: Props) => {
	const selectionOfAttachments = useSelection<string>(new Set(attachments.map(attachment => attachment.fileName)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfAttachments.allPossibleItems.size == 0 || selectionOfAttachments.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfAttachments.allPossibleItems.size > 0 && selectionOfAttachments.areAllItemsSelected
		}
	}, [selectionOfAttachments.selectedItems, attachments])

	const downloadAttachment = (attachment: EmailAttachment) => {
		const params = new URLSearchParams()
		params.set("externalAccountId", externalAccountId)
		params.set("messageId", email.uniqueId.toString())
		params.set("partSpecifier", attachment.partSpecifier)
		params.set("folder", selectedFolder) // email folders may have spaces, so lets use query params

		return <a href={`/api/email/download-attachment?${params.toString()}`}
			className="link ml-2">
			{attachment.fileName}
		</a>
	}

	return (
		attachments.length > 0 && (
			<div className="stack-vertical">
				<div className="stack-horizontal to-the-left">
					<label>
						<input
							ref={selectAllCheckboxRef}
							type="checkbox"
							className="checkbox"
							checked={selectionOfAttachments.areAllItemsSelected}
							onChange={() => selectionOfAttachments.areAllItemsSelected
								? selectionOfAttachments.clearSelection()
								: selectionOfAttachments.selectAllItems()
							} />
						Select all
					</label>

					<button className="btn"
						disabled={selectionOfAttachments.areNoItemsSelected}
						onClick={() => ingestAttachments(email.uniqueId, attachments.filter(attachment => selectionOfAttachments.selectedItems.has(attachment.fileName)))}
					>
						Add to unallocated
					</button>
				</div>

				{attachments.map(attachment => (
					<div key={attachment.fileName}>
						<SelectCheckbox selection={selectionOfAttachments} item={attachment.fileName} />

						<FontAwesomeIcon icon={faPaperclip} className="ml-1" />
						{downloadAttachment(attachment)}
					</div>
				))}
			</div>
		))
}

