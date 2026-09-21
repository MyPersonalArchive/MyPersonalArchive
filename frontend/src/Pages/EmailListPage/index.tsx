import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { PreviewList } from "../../Components/PreviewList"
import { useParams } from "react-router-dom"
import { useAtom, useAtomValue } from "jotai"
import { externalAccountsAtom } from "../../Utils/Atoms/externalAccountsAtom"
import { layoutStateAtom } from "../../Utils/Atoms/layoutStateAtom"
import { UUID } from "crypto"
import { useSelection } from "../../Utils/Selection"
import { useEffect, useRef } from "react"
import { faRefresh, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { Dialog } from "../../Components/Dialog"
import { EmailMaximized } from "./EmailMaximized"
import { EmailRow } from "./EmailRow"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"

export const EmailListPage = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const {adjustmentsModeIsOpen} = useAtomValue(layoutStateAtom)
	
	const params = useParams()
	const externalAccountId = params.id as UUID
	const externalAccount = accounts.find(account => account.id === externalAccountId)

	const { fetchEmailSummaries, emails, fetchFolders, folders, selectedFolder, setSelectedFolder, createArchiveItemFromEmails, createBlobsFromAttachments, isStreamingEmails } = useMailProvider(externalAccountId)

	const selectionOfEmails = useSelection<number>(new Set(emails.map(email => email.uniqueId)))
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

				<div className="join">
					<select className="select w-50 bg-base-100" value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)}>
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
					<button className="btn btn-primary" onClick={() => fetchFolders()}>
						<FontAwesomeIcon icon={faRefresh} />
					</button>
				</div>

				<button className="btn btn-primary"
					onClick={() => fetchEmailSummaries()}
					disabled={(selectedFolder ?? "") === ""}
				>
					Fetch emails
				</button>
			</div>
			<div>

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
			
				<div className="stack-horizontal to-the-right my-4">
					<label>
						Select all
						<input
							ref={selectAllCheckboxRef}
							type="checkbox"
							className="checkbox ml-2"
							checked={selectionOfEmails.areAllItemsSelected}
							onChange={() => selectionOfEmails.areAllItemsSelected
								? selectionOfEmails.clearSelection()
								: selectionOfEmails.selectAllItems()
							} />
					</label>

					<button className="btn btn-primary"
						disabled={selectionOfEmails.areNoItemsSelected}
						onClick={() => createArchiveItemFromEmails(emails.filter(email => selectionOfEmails.selectedItems.has(email.uniqueId)))}
					>
						{`Create from ${selectionOfEmails.selectedItems.size} email${selectionOfEmails.selectedItems.size != 1 ? "s" : ""}`}
					</button>
				</div>

				{emails.length > 0 &&
					<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
						<PreviewList
							items={emails}
							thumbnailPreviewTemplate={(email, maximize) =>
								<EmailRow
									key={email.uniqueId}
									email={email}
									createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
									selectionOfEmails={selectionOfEmails}
									maximize={maximize}
								/>
							}
							maximizedPreviewTemplate={(email, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext) =>
								<Dialog key={email.uniqueId} size="full"
									onClose={() => minimize()}
									closeOnEscape={true}
								>
									<EmailMaximized
										email={email}
										createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
										createBlobsFromAttachments={(messageId, attachments) => { createBlobsFromAttachments(messageId, attachments) }}
										externalAccountId={externalAccountId}
										selectedFolder={selectedFolder!}
										maximize={minimize}
									/>
								</Dialog>
							}
						/>
					</div>
				}


				{isStreamingEmails && (
					<div className="flex justify-center items-center gap-2 py-4 text-gray-400 text-sm">
						<FontAwesomeIcon icon={faSpinner} spinPulse />
						Loading emails...
					</div>
				)}

			</div>
		</>
	)
}