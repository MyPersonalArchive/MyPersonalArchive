import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { FullEmail } from "../../Utils/Atoms/EmailAtoms"
import { SelectCheckbox } from "../../Utils/Selection"
import { faPaperclip } from "@fortawesome/free-solid-svg-icons"
import { AddressList } from "./AddressList"
import { Selection } from "../../Utils/Selection"
import { clickIfNotSelectingText } from "../../Utils/event-helpers"


type Props = {
	email: FullEmail
	selectionOfEmails: Selection<number>
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	maximize: (email: FullEmail) => void
}
export const EmailRow = ({ email, selectionOfEmails, createArchiveItemFromEmails, maximize }: Props) => {
	return (
		<div key={email.uniqueId} className="div-row" >
			<div className="p-2">
				<div className="flex flex-horizontal justify-between mb-2 ">
					<div>
						<span className="font-bold" onClick={clickIfNotSelectingText(() => maximize(email))}>{email.subject}</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<div>
						<SelectCheckbox selection={selectionOfEmails} item={email.uniqueId} />
						{/* <button className="ml-3" type="button" onClick={() => maximize(email)}>
							<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
						</button> */}
					</div>
				</div>

				<div className="flex flex-horizontal justify-between text-xs my-2">
					<div>
						From: <AddressList addresses={email.from} />
					</div>
					<div>
						Date: {email.receivedTime}
					</div>
				</div>
			</div>

			<div className="overflow-hidden text-ellipsis whitespace-nowrap p-2">
				{email.previewText}
			</div>

			<div>
				<div className="stack-horizontal to-the-right p-2">
					<button className="btn btn-primary"
						onClick={() => createArchiveItemFromEmails([email])}
					>
						Create
					</button>
				</div>
			</div>
		</div>
	)
}