import { createPath, generatePath, useNavigate, useParams, useSearchParams } from "react-router-dom"
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

	const currentBlobIndex = visibleBlobs.findIndex(blob => blob.id === blobId)
	const canMovePrevious = currentBlobIndex > 0
	const canMoveNext = currentBlobIndex < visibleBlobs.length - 1

	const currentBlob = visibleBlobs.at(currentBlobIndex)

	const movePrevious = () => {
		if (canMovePrevious) {
			navigate(createPath({
				pathname: generatePath(RoutePaths.Blob.View, {blobId: visibleBlobs[currentBlobIndex - 1].id}),
				search: location.search
			}))

		}
	}

	const moveNext = () => {
		if (canMoveNext) {
			navigate(createPath({
				pathname: generatePath(RoutePaths.Blob.View, {blobId: visibleBlobs[currentBlobIndex + 1].id}),
				search: location.search
			}))
		}
	}

	useKeyboardShortcut(LeftKey, movePrevious, true)
	useKeyboardShortcut(RightKey, moveNext, true)
	
	
	return (
		<>
			{currentBlob && (
				<BlobPreviewMaximized
					blob={currentBlob!}
					minimize={() => {navigate(RoutePaths.Blob.List)}}
					canMovePrevious={canMovePrevious}
					canMoveNext={canMoveNext}
					movePrevious={() => movePrevious()}
					moveNext={() => moveNext()}
				/>
			)}
		</>
	)
}
