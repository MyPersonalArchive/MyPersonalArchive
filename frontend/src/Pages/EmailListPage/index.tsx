import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { createPath, generatePath, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useAtom, useAtomValue } from "jotai"
import { externalAccountsAtom } from "../../Utils/Atoms/externalAccountsAtom"
import { layoutStateAtom } from "../../Utils/Atoms/layoutStateAtom"
import { UUID } from "crypto"
import { useSelection } from "../../Utils/Selection"
import { useEffect, useRef } from "react"
import { faRefresh, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { EmailRow } from "./EmailRow"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"
import { Filter } from "./Filter"
import { archiveItemsAtom } from "../../Utils/Atoms/archiveItemsAtom"
import { RoutePaths } from "../../RoutePaths"

const RELOAD_FOLDERS_OPTION = `__reload-folders__${crypto.randomUUID()}__`

export const EmailListPage = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const { adjustmentsModeIsOpen } = useAtomValue(layoutStateAtom)
	const [searchParams, setSearchParams] = useSearchParams()
	const navigate = useNavigate()
	
	const params = useParams()
	const externalAccountId = params.externalAccountId as UUID
	const externalAccount = accounts.find(account => account.id === externalAccountId)

	const folderParam = searchParams.get("folder") ?? undefined
	const {
		fetchEmailSummaries,
		emails,
		fetchFolders,
		folders,
		selectedFolder,
		setSelectedFolder,
		createArchiveItemFromEmails,
		isStreamingEmails,
		ensureMailDataIsLoaded
	} = useMailProvider(externalAccountId, folderParam)

	useEffect(() => {
		void ensureMailDataIsLoaded()
	}, [externalAccountId])

	const setFolderQueryParam = (folder: string, replace = false) =>
		setSearchParams(oldParams => {
			const newParams = new URLSearchParams(oldParams)	// create a copy
			newParams.set("folder", folder)
			return newParams
		}, { replace })

	useEffect(() => {
		// ensure that folder list is loaded
		if (folders === undefined || folders.length === 0) {
			return
		}

		// ensure that the selected folder is valid
		if (folderParam !== undefined && folders.includes(folderParam)) {
			return
		}

		// if selected folder is not found, fall back to the first folder for account
		const fallbackFolder = selectedFolder !== undefined && folders.includes(selectedFolder)
			? selectedFolder
			: folders[0]
		setFolderQueryParam(fallbackFolder, true)
	}, [folders, folderParam, selectedFolder])

	useEffect(() => {
		// Fetch emails when folder changes (initial load, fallback, or manual switch) and isn't cached yet
		if (selectedFolder !== undefined && emails === undefined) {
			void fetchEmailSummaries(selectedFolder)
		}
	}, [selectedFolder, emails])

	// Keep the persisted folder in sync with whatever folder is actually resolved (URL, fallback, or manual switch)
	useEffect(() => {
		if (selectedFolder !== undefined) {
			setSelectedFolder(selectedFolder)
		}
	}, [selectedFolder])


	const archiveItems = useAtomValue(archiveItemsAtom)

	const allocatedEmailUniqueIds = new Set<number>(archiveItems.map(ai => ai.metadata.email?.identifier?.messageId))

	const selectionOfEmails = useSelection<number>(new Set(emails?.map(email => email.uniqueId)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfEmails.allPossibleItems.size == 0 || selectionOfEmails.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfEmails.allPossibleItems.size > 0 && selectionOfEmails.areAllItemsSelected
		}
	}, [selectionOfEmails.selectedItems, emails])

	const visibleEmails = emails?.filter(email => (searchParams.get("hideAllocatedEmails") !== "true") || !allocatedEmailUniqueIds.has(email.uniqueId))
	const selectedVisibleEmails = visibleEmails?.filter(email => selectionOfEmails.selectedItems.has(email.uniqueId))
	const numberOfSelectedVisibleEmails = selectedVisibleEmails?.length ?? 0

	function onMaximize(uniqueId: number): void {
		navigate(createPath({
			pathname: generatePath(RoutePaths.Email.View, {externalAccountId, folder: selectedFolder, uniqueId: uniqueId.toString()}),
			search: location.search
		}))
	}

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
					<select
						className="select w-50 bg-base-100"
						value={selectedFolder}
						onChange={e => {
							if (e.target.value === RELOAD_FOLDERS_OPTION) {
								void fetchFolders()
								return
							}
							setFolderQueryParam(e.target.value)
						}}
					>
						{folders === undefined && <option value="">-- Loading folders --</option>}
						{folders?.length === 0 && <option value="">-- No folders found --</option>}
						{folders?.map(folder => <option key={folder} value={folder}>{folder}</option>)}
						{folders !== undefined && <option value={RELOAD_FOLDERS_OPTION}>-- Reload folder list --</option>}
					</select>
					<button className="btn btn-primary" onClick={() => fetchEmailSummaries()}>
						<FontAwesomeIcon icon={faRefresh} />
					</button>
				</div>
			</div>

			<div className="dont-touch-walls flex flex-col flex-wrap gap-2 ">
				<div className="stack-horizontal to-the-right my-4">
					<button className="btn btn-primary"
						disabled={selectionOfEmails.areNoItemsSelected}
						onClick={() => createArchiveItemFromEmails(selectedVisibleEmails ?? [])}
					>
						{`Create from ${numberOfSelectedVisibleEmails} ${numberOfSelectedVisibleEmails != 1 ? "emails" : "email"}`}
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

			{ emails &&
				<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
					{visibleEmails?.map((email) =>
						<EmailRow
							key={email.uniqueId}
							email={email}
							isAllocated={allocatedEmailUniqueIds.has(email.uniqueId)}
							createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
							selectionOfEmails={selectionOfEmails}
							maximize={() => onMaximize(email.uniqueId)}
						/>
					)}
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