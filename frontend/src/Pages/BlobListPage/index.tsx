import { useNavigate, useSearchParams } from "react-router-dom"
import { PreviewList } from "../../Components/PreviewList"
import { BlobMetadata, blobsAtom } from "../../Utils/Atoms/blobsAtom"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"
import { MaximizedBlobPreview } from "./MaximizedBlobPreview"
import { Row } from "./Row"
import { useApiClient } from "../../Utils/Hooks/useApiClient"
import { useAtomValue } from "jotai"
import { useEffect, useState, useRef } from "react"
import { archiveItemsAtom } from "../../Utils/Atoms/archiveItemsAtom"
import { UUID } from "crypto"
import { useSelection } from "../../Utils/Selection"
import { RoutePaths } from "../../RoutePaths"
import { Filter } from "./Filter"


export const BlobListPage = () => {
	const [openDeleteAllSelectedDialog, setOpenDeleteAllSelectedDialog] = useState(false)

	const navigate = useNavigate()
	const apiClient = useApiClient()
	const [searchParams] = useSearchParams()

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

	const visibleBlobs = blobs.filter(blob => (searchParams.get("hideAllocatedBlobs") !== "true") || !allocatedBlobs.has(blob.id))

	const selectedVisibleBlobs = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))

	const onDeleteVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		await apiClient.execute("DeleteBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
	}

	const onDeleteBlob = (blobId: UUID) => {
		apiClient.execute("DeleteBlobs", { blobIds: [blobId] })
	}

	const createArchiveItemFromVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const blobsToAttach = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))

		const firstUploadDate = blobsToAttach[0]?.uploadedAt.toISOString().split("T")[0]
		const commonDocumentDate = blobsToAttach.length > 0 && blobsToAttach.every(blob => blob.uploadedAt.toISOString().split("T")[0] === firstUploadDate)
			? firstUploadDate
			: null
		const state = {
			blobIds: blobsToAttach.map(blob => blob.id),
			metadataTypes: [],
			documentDate: commonDocumentDate,	
		}
		navigate(`${RoutePaths.Archive.New}`, { state })

		selectionOfBlobs.clearSelection()
	}

	const onCreateArchiveItem = async (blob: BlobMetadata) => {
		const state = {
			blobIds: [blob.id],
			metadataTypes: [],
			documentDate: blob.uploadedAt.toISOString().split("T")[0],

		}
		navigate(`${RoutePaths.Archive.New}`, { state })
	}

	return (
		<>
			<div className="full-width-non-bordered flex flex-col gap-2">
				<Filter />
			</div>

			<div className="full-width-non-bordered flex flex-row flex-wrap gap-2 items-center my-4">

				<button className="btn btn-primary whitespace-nowrap"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={createArchiveItemFromVisibleSelectedBlobs}
				>
					Create from {selectedVisibleBlobs.length} selected
				</button>

				<button className="btn btn-warning whitespace-nowrap "
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={() => setOpenDeleteAllSelectedDialog(true)}
				>
					Delete {selectedVisibleBlobs.length} selected
				</button>

				<div className="flex-1"></div>

				<label className="whitespace-nowrap">
					Select all
					<input
						ref={selectAllCheckboxRef}
						type="checkbox"
						className="checkbox mx-2"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()		//TODO: Find a way to select only visible blobs
						} />
				</label>
			</div>


			<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
				<PreviewList<BlobMetadata> items={visibleBlobs}
					thumbnailPreviewTemplate={
						(blob, maximize) => <Row
							key={blob.id}
							blob={blob}
							onCreateArchiveItem={onCreateArchiveItem}
							onDeleteBlob={onDeleteBlob}
							maximize={maximize}
							selectionOfBlobs={selectionOfBlobs}
						/>
					}
					maximizedPreviewTemplate={
						(blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext) =>
							<MaximizedBlobPreview
								blob={blob}
								minimize={minimize}
								canMovePrevious={canMovePrevious}
								canMoveNext={canMoveNext}
								movePrevious={movePrevious}
								moveNext={moveNext}
							/>
					}
				/>
			</div>

			<ConfirmationDialog
				open={openDeleteAllSelectedDialog}
				prompt="Are you sure you want to delete all selected uploads?"
				onClose={() => setOpenDeleteAllSelectedDialog(false)}
				onConfirm={onDeleteVisibleSelectedBlobs}
			/>
		</>
	)
}