import { generatePath, createPath, useNavigate, useSearchParams } from "react-router-dom"
import { BlobMetadata } from "../../Utils/Atoms/blobsAtom"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"
import { BlobRow } from "./BlobRow"
import { useApiClient } from "../../Utils/Hooks/useApiClient"
import { useState } from "react"
import { UUID } from "crypto"
import { RoutePaths } from "../../RoutePaths"
import { Filter } from "./Filter"
import { useBlobList } from "../../Utils/Hooks/useBlobList"


export const BlobListPage = () => {
	const [openDeleteAllSelectedDialog, setOpenDeleteAllSelectedDialog] = useState(false)

	const navigate = useNavigate()
	const apiClient = useApiClient()
	const [searchParams] = useSearchParams()

	const showAllocatedBlobs = searchParams.get("hideAllocatedBlobs") !== "true"

	const {
		allocatedBlobs,
		selectionOfBlobs,
		selectAllCheckboxRef,
		visibleBlobs,
		selectedVisibleBlobs
	} = useBlobList(showAllocatedBlobs)

	const onDeleteVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		await apiClient.execute("DeleteBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
	}

	const onMaximize = (blobId: UUID) => {
		navigate(createPath({
			pathname: generatePath(RoutePaths.Blob.View, {blobId}),
			search: location.search
		}))
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
		navigate(RoutePaths.Archive.New, { state })

		selectionOfBlobs.clearSelection()
	}

	const onCreateArchiveItem = async (blob: BlobMetadata) => {
		const state = {
			blobIds: [blob.id],
			metadataTypes: [],
			documentDate: blob.uploadedAt.toISOString().split("T")[0],

		}
		navigate(RoutePaths.Archive.New, { state })
	}

	return (
		<>
			<div className="dont-touch-walls flex flex-col gap-2 mt-4">
				<Filter />
			</div>

			<div className="dont-touch-walls flex flex-row flex-wrap gap-2 items-center sticky-top bg-base-200 sticky-top-gradient">
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
						className="checkbox ml-2 sm:mr-2"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()
						} />
				</label>
			</div>

			<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
				{visibleBlobs.map((blob) =>
					<BlobRow
						key={blob.id}
						blob={blob}
						onCreateArchiveItem={onCreateArchiveItem}
						onDeleteBlob={onDeleteBlob}
						maximize={() => onMaximize(blob.id)}
						selectionOfBlobs={selectionOfBlobs}
						isAllocated={allocatedBlobs.has(blob.id)}
					/>
				)}
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