import { useEffect } from "react"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faArrowLeft, faArrowRight, faClose, faDownLeftAndUpRightToCenter, faPaperclip, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { AddressList } from "./AddressList"
import { AttachmentList } from "./AttachmentList"
import { EmailAttachment, FullEmail } from "../../Utils/Atoms/EmailAtoms"
import { UUID } from "crypto"
import { LightBox } from "../../Components/LightBox"


type Props = {
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
	closeOnEscape: boolean
	email: FullEmail
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	createBlobsFromAttachments: (messageId: number, attachments: EmailAttachment[]) => void
	externalAccountId: UUID
	selectedFolder: string
}
export const EmailMaximized = ({ minimize, canMovePrevious, canMoveNext, movePrevious, moveNext, closeOnEscape, email, createArchiveItemFromEmails, createBlobsFromAttachments, externalAccountId, selectedFolder }: Props) => {
	//TODO: request BodyHtml ?? BodyText from backend if not alread available

	const {fetchEmailContents} = useMailProvider(externalAccountId)
	useEffect(() => {
		fetchEmailContents(email)
	}, [email])


	return (
		<LightBox key={email.uniqueId} onClose={() => minimize()} closeOnEscape={closeOnEscape}>
			<div className="w-full h-full flex justify-center action-bar-host">
		
				<div className="grid-rows-3 bg-white">
					<div className="bg-base-300 p-4 sticky top-0">

						<div className="flex flex-horizontal justify-between mb-2">
							<div>
								<span className="font-bold">{email.subject}</span>
								{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
							</div>
							<button className="ml-3" type="button" onClick={() => minimize()}>
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

					<div className="p-4 sticky bottom-0 bg-base-300">
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
				<div className="action-bar">
					<button type="button" disabled={!canMovePrevious} onClick={e => { movePrevious(); e.stopPropagation() }} title="Prev">
						<FontAwesomeIcon icon={faArrowLeft} size="1x" />
					</button>
					<button type="button" disabled={!canMoveNext} onClick={e => { moveNext(); e.stopPropagation() }} title="Next">
						<FontAwesomeIcon icon={faArrowRight} size="1x" />
					</button>
					<button type="button" onClick={e => { minimize(); e.stopPropagation() }} title="Minimize">
						<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
					</button>
				</div>
				
			</div>
		</LightBox>
	)
}
