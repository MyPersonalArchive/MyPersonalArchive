import { useEffect, useRef, useState } from "react"
import { Email, EmailAddress, EmailAttachment, useMailProvider } from "../Utils/useMailProvider"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { SelectCheckbox, useSelection } from "../Utils/Selection"
import { PreviewList } from "../Components/PreviewList"
import type { Selection } from "../Utils/Selection"
import DOMPurify from "dompurify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faClose, faPaperclip, faRefresh, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"


export const EmailListPage = () => {
	const { provider, setProvider, login, fetchEmails, emails, fetchFolders, folders, selectedFolder, setSelectedFolder, createArchiveItemFromEmails, createBlobsFromAttachments } = useMailProvider()


	const selectionOfEmails = useSelection<string>(new Set(emails.map(email => email.uniqueId)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfEmails.allPossibleItems.size == 0 || selectionOfEmails.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfEmails.allPossibleItems.size > 0 && selectionOfEmails.areAllItemsSelected
		}
	}, [selectionOfEmails.selectedItems, emails])

	return (
		<div>
			<div className="stack-horizontal to-the-left my-4">
				<div className="group">

					<select className="input" value={provider} onChange={e => setProvider(e.target.value as "gmail" | "fastmail")}>
						<option value="gmail">Gmail</option>
						<option value="fastmail">Fastmail</option>
					</select>

					<button className="btn" onClick={() => login()}>
						Login
					</button>
				</div>

				<div className="group">
					<select className="input" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
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
					onClick={() => fetchEmails({ provider, folders: [selectedFolder!], limit: 50 })}
					disabled={(selectedFolder ?? "") === ""}
				>
					Fetch emails
				</button>
			</div>
			<div>

				<div className="stack-horizontal to-the-left my-4">
					<div className="text-green-600 bg-gray-900 font-mono text-sm w-full p-2">// TODO: show/hide filters, stored filters and display options</div>
					{/*
						<label>
							<input type="checkbox" /> Only show emails since last fetched timestamp
						</label>
						<label>
							<input type="checkbox" /> Show newest emails on top
						</label>
						<label>
							<input type="checkbox" /> Only show emails with attachments
						</label>
						<label>
							Filter by sender/subject/body etc <input type="text" className="input" />
						</label>
						<div>
							List of folders, other filters and display options go here.
						</div>
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

				<PreviewList<Email>
					blobs={emails}
					thumbnailPreviewTemplate={(email, maximize) =>
						<Thumbnail
							key={email.uniqueId}
							email={email}
							createArchiveItemFromEmails={createArchiveItemFromEmails}
							selectionOfEmails={selectionOfEmails}
							maximize={maximize}
						/>
					}
					maximizedPreviewTemplate={(email, minimize) =>
						<Preview
							key={email.uniqueId}
							email={email}
							createArchiveItemFromEmails={createArchiveItemFromEmails}
							createBlobsFromAttachments={createBlobsFromAttachments}
							provider={provider}
							selectedFolder={selectedFolder!}
							maximize={minimize}
						/>
					} />

			</div>
		</div >
	)
}


type ThumbnailProps = {
	email: Email
	selectionOfEmails: Selection<string>
	createArchiveItemFromEmails: (emails: Email[]) => void
	maximize: (email: Email) => void
}
const Thumbnail = ({ email, selectionOfEmails, createArchiveItemFromEmails, maximize }: ThumbnailProps) => {
	return (
		<div key={email.uniqueId} className="card">
			<div className="bg-gray-100 p-2">
				<div className="flex flex-horizontal justify-between mb-2 ">
					<div>
						<span className="font-bold">{email.subject}</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<div>
						<SelectCheckbox selection={selectionOfEmails} item={email.uniqueId} />
						<button className="ml-3" type="button" onClick={() => maximize(email)}>
							<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
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
				{email.body}
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


type PreviewProps = {
	email: Email
	createArchiveItemFromEmails: (emails: Email[]) => void
	createBlobsFromAttachments: (messageId: string, attachments: EmailAttachment[]) => void
	provider: string
	selectedFolder: string
	maximize: (email: Email) => void
}
const Preview = ({ email, createArchiveItemFromEmails, createBlobsFromAttachments, provider, selectedFolder, maximize: minimize }: PreviewProps) => {
	return (
		<div key={email.uniqueId} className="grid-rows-3">
			<div className="bg-gray-100 p-4 sticky top-0">

				<div className="flex flex-horizontal justify-between mb-2">
					<div>
						<span className="font-bold">{email.subject}</span>
						{email.attachments.length > 0 && <FontAwesomeIcon icon={faPaperclip} className="ml-1" />}
					</div>
					<button className="ml-3" type="button" onClick={() => minimize(email)}>
						<FontAwesomeIcon icon={faClose} size="1x" />
					</button>
				</div>

				<div className="flex flex-horizontal justify-between text-xs my-2">
					<div>From: <AddressList addresses={email.from} /></div>
					<div>Date: {email.receivedTime}</div>
				</div>
			</div>

			<div className="p-4 overflow-y-scroll">
				<div className="my-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email.htmlBody ?? email.body) }}>
				</div>
			</div>

			<div className="p-4 border-t border-gray-300 sticky bottom-0 bg-white">
				<div className="flex flex-row justify-between">

					<div className="max-h-50 overflow-y-auto">
						<AttachmentList attachments={email.attachments} email={email} provider={provider} selectedFolder={selectedFolder} ingestAttachments={createBlobsFromAttachments} />
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
	email: Email
	provider: string
	selectedFolder: string
	ingestAttachments: (messageId: string, attachments: EmailAttachment[]) => void
}
const AttachmentList = ({ attachments, email, provider, selectedFolder, ingestAttachments }: AttachmentListProps) => {
	const selectionOfAttachments = useSelection<string>(new Set(attachments.map(attachment => attachment.fileName)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfAttachments.allPossibleItems.size == 0 || selectionOfAttachments.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfAttachments.allPossibleItems.size > 0 && selectionOfAttachments.areAllItemsSelected
		}
	}, [selectionOfAttachments.selectedItems, attachments])

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
						<a href={`/api/email/${provider}/download-attachment?messageId=${email.uniqueId}&fileName=${attachment.fileName}&folder=${selectedFolder}`}
							className="link ml-2"
						>
							{attachment.fileName}
						</a>
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
				<span key={address.emailAddress}>
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


export default function AuthCallback() {
	const { handleAuthCallback } = useMailProvider()
	const navigate = useNavigate()

	useEffect(() => {
		(async () => {
			await handleAuthCallback()
			// Redirect user back to app dashboard
			navigate(RoutePaths.Email)
		})()
	}, [])

	return <p>Finalizing authentication...</p>
}