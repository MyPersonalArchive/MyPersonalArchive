import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { FullEmail } from "../../Utils/Atoms/EmailAtoms"
import { SelectCheckbox } from "../../Utils/Selection"
import { faPaperclip } from "@fortawesome/free-solid-svg-icons"
import { AddressList } from "./AddressList"
import { Selection } from "../../Utils/Selection"
import { clickIfNotSelectingText } from "../../Utils/event-helpers"
import { isoToShortDateDisplay, isoToShortTimeDisplay } from "../../Utils/formatUtils"
import classNames from "classnames"


type Props = {
	email: FullEmail
	isAllocated: boolean
	selectionOfEmails: Selection<number>
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	maximize: (email: FullEmail) => void
}
export const EmailRow = ({ email, isAllocated, selectionOfEmails, createArchiveItemFromEmails, maximize }: Props) => {
	return (
		<div key={email.uniqueId} className="div-row group/email" onClick={clickIfNotSelectingText(() => maximize(email))}>
			<div className="p-2">
				<div className="flex flex-horizontal justify-between mb-2 ">
					<div>
						<span className={classNames("link link-primary link-hover group-hover/email:underline", { "font-bold": !isAllocated })}>
							{email.subject}
						</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<div>
						<SelectCheckbox selection={selectionOfEmails} item={email.uniqueId} />
					</div>
				</div>

				<div className="flex flex-horizontal justify-between text-xs my-2">
					<div>
						From: <AddressList addresses={email.from} />
					</div>
					<div>
						{isoToShortDateDisplay(email.receivedTime)} {isoToShortTimeDisplay(email.receivedTime)}
					</div>
				</div>
			</div>

			<div className="p-2">
				<span className="line-clamp-2">{email.previewText}</span>
			</div>

			<div className="stack-horizontal to-the-left p-2">
				<button
					className="btn btn-primary"
					onClick={e => { e.stopPropagation(); createArchiveItemFromEmails([email]) }}
				>
						Create archive item
				</button>
			</div>
		</div>
	)
}