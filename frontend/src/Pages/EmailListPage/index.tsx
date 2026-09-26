import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { PreviewList } from "../../Components/PreviewList"
import { useParams, useSearchParams } from "react-router-dom"
import { useAtom, useAtomValue } from "jotai"
import { externalAccountsAtom } from "../../Utils/Atoms/externalAccountsAtom"
import { layoutStateAtom } from "../../Utils/Atoms/layoutStateAtom"
import { UUID } from "crypto"
import { useSelection } from "../../Utils/Selection"
import { useEffect, useRef } from "react"
import { faRefresh, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { EmailMaximized } from "./EmailMaximized"
import { EmailRow } from "./EmailRow"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"
import { Filter } from "./Filter"
import { archiveItemsAtom } from "../../Utils/Atoms/archiveItemsAtom"

export const EmailListPage = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const { adjustmentsModeIsOpen } = useAtomValue(layoutStateAtom)
	const [searchParams] = useSearchParams()

	const params = useParams()
	const externalAccountId = params.accountId as UUID
	const externalAccount = accounts.find(account => account.id === externalAccountId)

	const { fetchEmailSummaries, emails, fetchFolders, folders, selectedFolder, setSelectedFolder, createArchiveItemFromEmails, createBlobsFromAttachments, isStreamingEmails } = useMailProvider(externalAccountId)
	const archiveItems = useAtomValue(archiveItemsAtom)

	const allocatedEmailUniqueIds = new Set<number>(archiveItems.map(ai => ai.metadata.email?.identifier?.messageId))

	const selectionOfEmails = useSelection<number>(new Set(emails.map(email => email.uniqueId)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfEmails.allPossibleItems.size == 0 || selectionOfEmails.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfEmails.allPossibleItems.size > 0 && selectionOfEmails.areAllItemsSelected
		}
	}, [selectionOfEmails.selectedItems, emails])
	const visibleEmails = emails.filter(email => (searchParams.get("hideAllocatedEmails") !== "true") || !allocatedEmailUniqueIds.has(email.uniqueId))
	const selectedVisibleEmails = visibleEmails.filter(email => selectionOfEmails.selectedItems.has(email.uniqueId))

	return (
		<>
			<header className="dont-touch-walls header sm:hidden">
				<h1>
					{adjustmentsModeIsOpen
						? <input className=""
							value={externalAccount?.displayName ?? "<unknown account>"}
							onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", id: externalAccountId, displayName: e.target.value })}
						/>
						: externalAccount?.displayName ?? "<unknown account>"}
				</h1>
			</header>
			
			<div className="dont-touch-walls flex flex-col gap-2 mb-4">
				<Filter />
			</div>

			<div className="dont-touch-walls flex flex-row gap-2">

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

			<div className="dont-touch-walls flex flex-col flex-wrap gap-2 ">
				<div className="stack-horizontal to-the-right my-4">
					<button className="btn btn-primary"
						disabled={selectionOfEmails.areNoItemsSelected}
						onClick={() => createArchiveItemFromEmails(selectedVisibleEmails)}
					>
						{`Create from ${selectedVisibleEmails.length} email${selectedVisibleEmails.length != 1 ? "s" : ""}`}
					</button>

					<div className="flex-1"></div>

					<label>
						Select all
						<input
							ref={selectAllCheckboxRef}
							type="checkbox"
							className="checkbox ml-2 sm:mr-2"
							checked={selectionOfEmails.areAllItemsSelected}
							onChange={() => selectionOfEmails.areAllItemsSelected
								? selectionOfEmails.clearSelection()
								: selectionOfEmails.selectAllItems()
							} />
					</label>
				</div>
			</div>

			{ emails.length > 0 &&
				<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
					<PreviewList
						items={visibleEmails}
						thumbnailPreviewTemplate={(email, maximize) =>
							<EmailRow
								key={email.uniqueId}
								email={email}
								isAllocated={allocatedEmailUniqueIds.has(email.uniqueId)}
								createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
								selectionOfEmails={selectionOfEmails}
								maximize={maximize}
							/>
						}
						maximizedPreviewTemplate={(email, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext) =>
							<EmailMaximized
								minimize={minimize}
								canMovePrevious={canMovePrevious}
								canMoveNext={canMoveNext}
								movePrevious={movePrevious}
								moveNext={moveNext}
								closeOnEscape={true}
								email={email}
								createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
								createBlobsFromAttachments={(messageId, attachments) => { createBlobsFromAttachments(messageId, attachments) }}
								externalAccountId={externalAccountId}
								selectedFolder={selectedFolder!}
							/>
						}
					/>
					{isStreamingEmails && (
						<div className="flex justify-center items-center gap-2 py-4 text-gray-400 text-sm">
							<FontAwesomeIcon icon={faSpinner} spinPulse />
					Loading emails...
						</div>
					)}
				</div>
			}



		</>
	)
}