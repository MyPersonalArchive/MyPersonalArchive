import { useContext, useEffect, useRef } from "react"
import { useMailProvider } from "../Utils/Hooks/useMailProvider"
import { FullEmail, EmailAddress, EmailAttachment } from "../Utils/Atoms"
import { SelectCheckbox, useSelection } from "../Utils/Selection"
import { PreviewList } from "../Components/PreviewList"
import type { Selection } from "../Utils/Selection"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose, faPaperclip, faRefresh, faSpinner, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { useParams } from "react-router-dom"
import { useAtom, useAtomValue } from "jotai"
import { externalAccountsAtom } from "../Utils/Atoms/externalAccountsAtom"
import { UUID } from "crypto"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { layoutStateAtom } from "../Utils/Atoms/layoutStateAtom"
import { Dialog } from "../Components/Dialog"


export const EmailListPage = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const {adjustmentsModeIsOpen} = useAtomValue(layoutStateAtom)
	
	const params = useParams()
	const externalAccountId = params.id as UUID
	const externalAccount = accounts.find(account => account.id === externalAccountId)

	const { fetchEmailSummaries, emails, fetchFolders, folders, selectedFolder, setSelectedFolder, createArchiveItemFromEmails, createBlobsFromAttachments } = useMailProvider(externalAccountId)

	const selectionOfEmails = useSelection<string>(new Set(emails.map(email => email.uniqueId)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfEmails.allPossibleItems.size == 0 || selectionOfEmails.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfEmails.allPossibleItems.size > 0 && selectionOfEmails.areAllItemsSelected
		}
	}, [selectionOfEmails.selectedItems, emails])

	return (
		<>
			<header className="header">
				<h1>
					{adjustmentsModeIsOpen
						? <input className=""
							value={externalAccount?.displayName ?? "<unknown account>"}
							onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", id: externalAccountId, displayName: e.target.value })}
						/>
						: externalAccount?.displayName ?? "<unknown account>"}
				</h1>
			</header>
			<div className="stack-horizontal to-the-left my-4">

				<div className="grouped">
					<select className="input bg-white" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
						{
							folders === undefined
								? <option value="">-- Hit refresh --</option>
								: folders.length === 0
									? <option value="">-- No folders found --</option>
									: <option value="">-- Select a folder --</option>
						}
						{
							folders?.map(folder => (
								<option key={folder} value={folder}>{folder}</option>
							))
						}
					</select>
					<button className="btn" onClick={() => fetchFolders()}>
						<FontAwesomeIcon icon={faRefresh} />
					</button>
				</div>

				<button className="btn"
					onClick={() => fetchEmailSummaries()}
					disabled={(selectedFolder ?? "") === ""}
				>
					Fetch emails
				</button>
			</div>
			<div>

				<div className="stack-horizontal to-the-left my-4">
					<div className="todo">//TODO: show/hide filters, stored filters and display options</div>
					{/*
					Auto load folders on login. Should we store folders and currentFolder per account?
					Filters
						- Only show emails since last fetched timestamp [checkbox]
						- Only show emails with attachments [checkbox]
						- Filter by sender/subject/body etc [input box]
						- Download from specific folder(s) [select multiple]
					Stored filters?
					Display options
						- Group by conversation	[checkbox]
					*/}
				</div>

				<div className="stack-horizontal to-the-right my-4">
					<label>
						<input ref={selectAllCheckboxRef} type="checkbox"
							checked={selectionOfEmails.areAllItemsSelected}
							onChange={() => selectionOfEmails.areAllItemsSelected
								? selectionOfEmails.clearSelection()
								: selectionOfEmails.selectAllItems()
							} />
						Select all
					</label>

					<button className="btn"
						disabled={selectionOfEmails.areNoItemsSelected}
						onClick={() => createArchiveItemFromEmails(emails.filter(email => selectionOfEmails.selectedItems.has(email.uniqueId)))}
					>
						{
							selectionOfEmails.allPossibleItems.size == selectionOfEmails.selectedItems.size
								? "Create from all emails"
								: `Create from ${selectionOfEmails.selectedItems.size} email${selectionOfEmails.selectedItems.size != 1 ? "s" : ""}`
						}
					</button>
				</div>

				<PreviewList<FullEmail>
					items={emails}
					keySelector={email => email.uniqueId}
					thumbnailPreviewTemplate={(email, maximize) =>
						<EmailThumbnail
							key={email.uniqueId}
							email={email}
							createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
							selectionOfEmails={selectionOfEmails}
							maximize={maximize}
						/>
					}
					maximizedPreviewTemplate={(email, minimize) =>
						<Dialog key={email.uniqueId} size="full"
							onClose={() => minimize()}
							closeOnEscape={true}
						>
							<EmailPreview
								email={email}
								createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
								createBlobsFromAttachments={(messageId, attachments) => { createBlobsFromAttachments(messageId, attachments) }}
								externalAccountId={externalAccountId}
								selectedFolder={selectedFolder!}
								maximize={minimize}
							/>
						</Dialog>
					} />

			</div>
		</ >
	)
}


type EmailThumbnailProps = {
	email: FullEmail
	selectionOfEmails: Selection<string>
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	maximize: (email: FullEmail) => void
}
const EmailThumbnail = ({ email, selectionOfEmails, createArchiveItemFromEmails, maximize }: EmailThumbnailProps) => {
	return (
		<div key={email.uniqueId} className="card" >
			<div className="bg-gray-100 p-2">
				<div className="flex flex-horizontal justify-between mb-2 ">
					<div>
						<span className="font-bold">{email.subject}</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<div>
						<SelectCheckbox selection={selectionOfEmails} item={email.uniqueId} />
						<button className="ml-3" type="button" onClick={() => maximize(email)}>
							<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} />
						</button>
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
					<button className="btn"
						onClick={() => createArchiveItemFromEmails([email])}
					>
						Create
					</button>
				</div>
			</div>
		</div>
	)
}


type EmailPreviewProps = {
	email: FullEmail
	createArchiveItemFromEmails: (emails: FullEmail[]) => void
	createBlobsFromAttachments: (messageId: string, attachments: EmailAttachment[]) => void
	externalAccountId: string
	selectedFolder: string
	maximize: (email: FullEmail) => void
}
const EmailPreview = ({ email, createArchiveItemFromEmails, createBlobsFromAttachments, externalAccountId, selectedFolder, maximize: minimize }: EmailPreviewProps) => {
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


type AttachmentListProps = {
	attachments: EmailAttachment[]
	email: FullEmail
	externalAccountId: string
	selectedFolder: string
	ingestAttachments: (messageId: string, attachments: EmailAttachment[]) => void
}
const AttachmentList = ({ attachments, email, externalAccountId, selectedFolder, ingestAttachments }: AttachmentListProps) => {
	const selectionOfAttachments = useSelection<string>(new Set(attachments.map(attachment => attachment.fileName)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)

	const { currentTenantId } = useContext(CurrentTenantIdContext)

	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfAttachments.allPossibleItems.size == 0 || selectionOfAttachments.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfAttachments.allPossibleItems.size > 0 && selectionOfAttachments.areAllItemsSelected
		}
	}, [selectionOfAttachments.selectedItems, attachments])

	const downloadAttachment = (attachment: EmailAttachment) => {
		const params = new URLSearchParams()
		params.set("externalAccountId", externalAccountId)
		params.set("tenant-id", `${currentTenantId}`)
		params.set("messageId", email.uniqueId)
		params.set("fileName", attachment.fileName)
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
						<input ref={selectAllCheckboxRef} type="checkbox"
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


type AddressListProps = {
	addresses: EmailAddress[]
}
const AddressList = ({ addresses }: AddressListProps) => {
	return (
		<>
			{addresses.map((address, ix) => (
				<span key={ix}>
					<Address address={address} />
					{ix < addresses.length - 1 && "; "}
				</span>
			))}
		</>
	)
}


type AddressProps = {
	address: EmailAddress
}
const Address = ({ address }: AddressProps) => {
	return <span title={address.emailAddress}>{address.name ?? address.emailAddress}</span>
}

