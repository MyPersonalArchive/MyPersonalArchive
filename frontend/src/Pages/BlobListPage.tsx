import { useRef, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { PreviewList } from "../Components/PreviewList"
import { DimensionEnum } from "../Components/Preview"
import { Preview } from "../Components/Preview"
import { FileDropZone } from "../Components/FileDropZone"
import { useSelection, Selection, SelectCheckbox } from "../Utils/Selection"
import { createQueryString } from "../Utils/createQueryString"
import { formatDate, formatFileSize } from "../Utils/formatUtils"


export const BlobListPage = () => {
	const navigate = useNavigate()
	const apiClient = useApiClient()

	const unallocatedHeap = useAtomValue(unallocatedBlobsAtom)

	const selectionOfBlobs = useSelection<number>(new Set(unallocatedHeap.map(blob => blob.id)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.allPossibleItems.size == 0 || selectionOfBlobs.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfBlobs.allPossibleItems.size > 0 && selectionOfBlobs.areAllItemsSelected
		}
	}, [selectionOfBlobs.selectedItems, unallocatedHeap])

	const deleteSelectedUnallocatedBlobs = () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		deleteBlobs(Array.from(selectionOfBlobs.selectedItems))
		selectionOfBlobs.clearSelection()
	}

	const deleteBlobs = (blobIds: number[]) => {
		apiClient.delete("/api/blob/delete", { blobIds })
	}

	const createArchiveItemFromSelectedUnallocatedBlobs = () => {
		apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: Array.from(selectionOfBlobs.selectedItems) })
			.then(newArchiveItemId => {
				selectionOfBlobs.clearSelection()
				navigate(`/archive/edit/${newArchiveItemId}`)
			})
	}

	const attachBlob = (id: number) => {
		apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] })
			.then(newArchiveItemId => {
				navigate(`/archive/edit/${newArchiveItemId}`)
			})
	}

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="heading-1">
				Blobs
			</h1>

			<FileDropZone onBlobAttached={() => { /* //TODO: what? */ }} />

			<Filter />

			<div className="stack-horizontal to-the-right my-4">
				<label>
					<input ref={selectAllCheckboxRef} type="checkbox"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()
						} />
					Select all
				</label>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={createArchiveItemFromSelectedUnallocatedBlobs}
				>
					Create from all selected
				</button>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={deleteSelectedUnallocatedBlobs}
				>
					Delete all selected
				</button>
			</div>

			<PreviewList<UnallocatedBlob> items={unallocatedHeap}
				thumbnailPreviewTemplate={
					(blob, maximize) => <BlobCard
						key={blob.id}
						blob={blob}
						attachBlob={attachBlob}
						deleteBlobs={deleteBlobs}
						maximize={maximize}
						selectionOfBlobs={selectionOfBlobs}
					/>
				}
				maximizedPreviewTemplate={
					(blob, minimize) =>
						<Preview key={blob.id} blob={blob} dimension={DimensionEnum.full}
							onMinimize={minimize} />
				}
			/>

		</div>
	)
}


type BlobCardProps = {
	blob: UnallocatedBlob
	attachBlob: (id: number) => void
	deleteBlobs: (blobIds: number[]) => void
	maximize: (blob: UnallocatedBlob) => void
	selectionOfBlobs: Selection<number>
}
const BlobCard = ({ blob, attachBlob, deleteBlobs, maximize, selectionOfBlobs }: BlobCardProps) => {
	return (
		<div className="card flex flex-row relative">
			
			<div className="bg-gray-200 p-2 w-50 h-50 flex justify-center">
				<Preview key={blob.id} blob={blob} dimension={DimensionEnum.thumbnail} onMaximize={maximize} />
			</div>

			<div className="p-2 grow">
				<div className="flex flex-col py-2 px-4">
					<div className="font-bold">{blob.fileName}</div>
					<div className=" text-sm">{formatDate(new Date(blob.uploadedAt))}</div>
					<div className=" text-sm">{blob.uploadedByUser}</div>
					<div className=" text-sm">{formatFileSize(blob.fileSize)}</div>
				</div>

				<SelectCheckbox className="absolute right-2 top-2" selection={selectionOfBlobs} item={blob.id} />

				<div className="absolute bottom-2 right-2 space-x-2">
					<button className="btn" onClick={() => attachBlob(blob.id)}>Add</button>
					<button className="btn" onClick={() => deleteBlobs([blob.id])}>Delete</button>
				</div>

			</div>
		</div>
	)
}


const Filter = () => {
	const [hideAllocatedBlobs, setHideAllocatedBlobs] = useState<boolean>(true)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		setHideAllocatedBlobs(searchParams.get("hideAllocatedBlobs") === "true")
	}, [])

	useEffect(() => {
		navigate({
			search: createQueryString({ hideAllocatedBlobs }, { skipEmptyStrings: true })
		})
	}, [hideAllocatedBlobs])

	return (
		<div className="stack-horizontal to-the-left my-4">
			<label>
				<input type="checkbox" checked={hideAllocatedBlobs} onChange={() => setHideAllocatedBlobs(b => !b)} />
				Hide allocated blobs
			</label>
		</div>
	)
}