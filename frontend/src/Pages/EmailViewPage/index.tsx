import { createPath, generatePath, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { RoutePaths } from "../../RoutePaths"
import { EmailMaximized } from "../EmailListPage/EmailMaximized"
import { LeftOrRightKey, useKeyboardShortcut } from "../../Utils/Hooks/useKeyboardShortcut"
import { useMailProvider } from "../../Utils/Hooks/useMailProvider"
import { UUID } from "crypto"
import { FullEmail } from "../../Utils/Atoms/EmailAtoms"

export const EmailViewPage = () => {
	const { externalAccountId: rawExternalAccountId, uniqueId: rawUniqueId, folder: initialFolder } = useParams<{ externalAccountId: string, folder: string, uniqueId: string }>()
	const uniqueId = Number.parseInt(rawUniqueId!, 10)
	const externalAccountId = rawExternalAccountId as UUID

	const [searchParams] = useSearchParams()

	const navigate = useNavigate()

	const {
		fetchEmailSummaries,
		emails,
		fetchFolders,
		folders,
		selectedFolder,
		setSelectedFolder,
		createArchiveItemFromEmails,
		createBlobsFromAttachments,
	} = useMailProvider(externalAccountId, initialFolder)

	useEffect(() => {
		const loadIfNeeded = async () => {
			if (folders === undefined) {
				await fetchFolders()
				return
			}

			if ((selectedFolder ?? "") === "" && folders.length > 0) {
				setSelectedFolder(folders[0])
				return
			}

			if ((selectedFolder ?? "") !== "" && emails === undefined) {
				await fetchEmailSummaries()
			}
		}

		void loadIfNeeded()
	}, [emails, fetchEmailSummaries, fetchFolders, folders, selectedFolder, setSelectedFolder])

	const allocatedEmails = new Set()
	
	const visibleEmails = emails?.filter(email => (searchParams.get("hideAllocatedEmails") !== "true") || !allocatedEmails.has(email.uniqueId))


	const currentEmailIndex = visibleEmails?.findIndex(email => email.uniqueId === uniqueId) ?? -1
	const canMovePrevious = (currentEmailIndex ?? -1) > 0
	const canMoveNext = (currentEmailIndex ?? -1) < (visibleEmails?.length ?? 0) - 1

	const currentEmail = visibleEmails?.[currentEmailIndex]

	const movePrevious = () => {
		if (canMovePrevious) {
			navigate(createPath({
				pathname: generatePath(RoutePaths.Email.View, {uniqueId: visibleEmails?.[currentEmailIndex - 1]?.uniqueId.toString() ?? "", folder: selectedFolder, externalAccountId}),
				search: location.search
			}))

		}
	}

	const moveNext = () => {
		if (canMoveNext) {
			navigate(createPath({
				pathname: generatePath(RoutePaths.Email.View, {uniqueId: visibleEmails?.[currentEmailIndex + 1]?.uniqueId.toString() ?? "", folder: selectedFolder, externalAccountId}),
				search: location.search
			}))
		}
	}

	useKeyboardShortcut(LeftOrRightKey, (e) => {
		if (e.key === "ArrowLeft") {
			movePrevious()
		} else if (e.key === "ArrowRight") {
			moveNext()
		}
	}, true)


	const onMinimize = () => {
		navigate(createPath({
			pathname: generatePath(RoutePaths.Email.List, { externalAccountId }),
			search: location.search
		}))
	}

	return (
		<>
			{currentEmail && (

				<EmailMaximized
					minimize={() => onMinimize()}
					canMovePrevious={canMovePrevious}
					canMoveNext={canMoveNext}
					movePrevious={movePrevious}
					moveNext={moveNext}
					closeOnEscape={true}
					email={currentEmail}
					createArchiveItemFromEmails={(emails) => { createArchiveItemFromEmails(emails) }}
					createBlobsFromAttachments={(messageId, attachments) => { createBlobsFromAttachments(messageId, attachments) }}
					externalAccountId={externalAccountId}
					selectedFolder={selectedFolder!}
				/>
			)}
		</>
	)
}
