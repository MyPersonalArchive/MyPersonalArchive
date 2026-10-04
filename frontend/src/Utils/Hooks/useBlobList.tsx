import { UUID } from "crypto"
import { useAtomValue } from "jotai"
import { useRef, useEffect } from "react"
import { archiveItemsAtom } from "../Atoms/archiveItemsAtom"
import { blobsAtom } from "../Atoms/blobsAtom"
import { useSelection } from "../Selection"

export const useBlobList = (showAllocatedBlobs: boolean) => {
	const blobs = useAtomValue(blobsAtom)
	const archiveItems = useAtomValue(archiveItemsAtom)
	const allocatedBlobs = new Set<UUID>(archiveItems.flatMap(ai => ai.blobIds))

	const selectionOfBlobs = useSelection<UUID>(new Set(blobs.map(blob => blob.id)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.allPossibleItems.size == 0 || selectionOfBlobs.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfBlobs.allPossibleItems.size > 0 && selectionOfBlobs.areAllItemsSelected
		}
	}, [selectionOfBlobs.selectedItems, blobs])

	const visibleBlobs = blobs.filter(blob => showAllocatedBlobs || !allocatedBlobs.has(blob.id))

	const selectedVisibleBlobs = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))


	return {
		allocatedBlobs,
		selectionOfBlobs,
		selectAllCheckboxRef,
		visibleBlobs,
		selectedVisibleBlobs
	}
}
