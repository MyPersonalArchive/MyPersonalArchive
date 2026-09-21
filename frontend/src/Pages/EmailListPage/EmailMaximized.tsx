import { useEffect } from "react"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose, faPaperclip, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { AddressList } from "./AddressList"
import { AttachmentList } from "./AttachmentList"
import { EmailAttachment, FullEmail } from "../../Utils/Atoms/EmailAtoms"
import { UUID } from "crypto"


type Props = {
	email: FullEmail
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	createBlobsFromAttachments: (messageId: number, attachments: EmailAttachment[]) => void
	externalAccountId: UUID
	selectedFolder: string
	maximize: (email: FullEmail) => void
}
export const EmailMaximized = ({ email, createArchiveItemFromEmails, createBlobsFromAttachments, externalAccountId, selectedFolder, maximize: minimize }: Props) => {
	//TODO: request BodyHtml ?? BodyText from backend if not alread available

	const {fetchEmailContents} = useMailProvider(externalAccountId)
	useEffect(() => {
		fetchEmailContents(email)
	}, [email])


	return (
		<div className="grid-rows-3">
			<div className="bg-gray-100 p-4 sticky top-0">

				<div className="flex flex-horizontal justify-between mb-2">
					<div>
						<span className="font-bold">{email.subject}</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<button className="ml-3" type="button" onClick={() => minimize(email)}>
						<FontAwesomeIcon icon={faClose} />
					</button>
				</div>

				<div className="flex flex-horizontal justify-between text-xs my-2">
					<div>From: <AddressList addresses={email.from} /></div>
					<div>Date: {email.receivedTime}</div>
				</div>
			</div>

			<div className="p-4 overflow-y-scroll">
				{email.htmlBody === undefined && email.body === undefined
					? <div className="my-2 flex flex-col gap-3">
						<div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
							<FontAwesomeIcon icon={faSpinner} spinPulse />
							Loading email content...
						</div>
					</div>
					: <div className="my-2" dangerouslySetInnerHTML={{ __html: email.htmlBody ?? email.body ?? "" }} />
				}
			</div>

			<div className="p-4 border-t border-gray-300 sticky bottom-0 bg-white">
				<div className="flex flex-row justify-between">
					<div className="max-h-50 overflow-y-auto">
						<AttachmentList attachments={email.attachments} email={email} externalAccountId={externalAccountId} selectedFolder={selectedFolder} ingestAttachments={createBlobsFromAttachments} />
					</div>

					<div style={{ alignSelf: "flex-end" }}>
						<button className="btn"
							onClick={() => createArchiveItemFromEmails([email])}
						>
							Create
						</button>
					</div>

				</div>
			</div>
		</div>
	)
}
