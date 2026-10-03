import { createPath, generatePath, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { useNextAndPreviousNavigation } from "../../Utils/Hooks/useNextAndPreviousNavigation"
import { BlobPreviewMaximized } from "./BlobPreviewMaximized"
import { UUID } from "crypto"
import { useAtomValue } from "jotai"
import { blobsAtom } from "../../Utils/Atoms/blobsAtom"
import { archiveItemsAtom } from "../../Utils/Atoms/archiveItemsAtom"
import { RoutePaths } from "../../RoutePaths"
import { LeftKey, RightKey, useKeyboardShortcut } from "../../Utils/Hooks/useKeyboardShortcut"


export const BlobViewPage = () => {
	const { blobId } = useParams<{ blobId: UUID }>()
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const archiveItems = useAtomValue(archiveItemsAtom)
	const allocatedBlobs = new Set<UUID>(archiveItems.flatMap(ai => ai.blobIds))

	const blobs = useAtomValue(blobsAtom)
	const visibleBlobs = blobs.filter(blob => (searchParams.get("hideAllocatedBlobs") !== "true") || !allocatedBlobs.has(blob.id))

	const {
		canMovePrevious,
		canMoveNext,
		movePrevious,
		moveNext,
		currentItem,
	} = useNextAndPreviousNavigation(visibleBlobs, visibleBlobs.find(blob => blob.id === blobId))

	useKeyboardShortcut(LeftKey, movePrevious, true)
	useKeyboardShortcut(RightKey, moveNext, true)
	
	const minimize = () => navigate(RoutePaths.Blob.List)
	
	return (
		<>
			{currentItem && (
				<BlobPreviewMaximized
					blob={currentItem!}
					minimize={() => minimize()}
					canMovePrevious={canMovePrevious}
					canMoveNext={canMoveNext}
					movePrevious={() => movePrevious()}
					moveNext={() => moveNext()}
				/>
			)}
		</>
	)
}
