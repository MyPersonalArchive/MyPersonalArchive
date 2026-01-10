import { useRef, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { Blob, blobsAtom } from "../Utils/Atoms"
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
	const [searchParams] = useSearchParams()

	const blobs = useAtomValue(blobsAtom)

	const selectionOfBlobs = useSelection<number>(new Set(blobs.map(blob => blob.id)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.allPossibleItems.size == 0 || selectionOfBlobs.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfBlobs.allPossibleItems.size > 0 && selectionOfBlobs.areAllItemsSelected
		}
	}, [selectionOfBlobs.selectedItems, blobs])

	const visibleBlobs = blobs.filter(blob => (searchParams.get("hideAllocatedBlobs") !== "true") || !blob.isAllocated)
	
	const selectedVisibleBlobs = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))
	
	const deleteVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		await apiClient.delete("/api/blob/delete", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
	}

	const deleteBlob = (blobId: number) => {
		apiClient.delete("/api/blob/delete", { blobIds: [blobId] })
	}

	const createArchiveItemFromVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		const newArchiveItemId = await apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
		navigate(`/archive/edit/${newArchiveItemId}`)
	}

	const attachBlob = async (id: number) => {
		const newArchiveItemId = await apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] })
		navigate(`/archive/edit/${newArchiveItemId}`)
	}

	return (
		<>
			<h1 className="heading-1">
				Documents and media
			</h1>

			<FileDropZone onBlobAttached={() => { /* //TODO: what? */ }} />

			<Filter />

			<div className="stack-horizontal to-the-right my-4">
				<label>
					<input ref={selectAllCheckboxRef} type="checkbox"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()		//TODO: Find a way to select only visible blobs
						} />
					Select all
				</label>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={createArchiveItemFromVisibleSelectedBlobs}
				>
					Create from {selectedVisibleBlobs.length} selected
				</button>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={deleteVisibleSelectedBlobs}
				>
					Delete {selectedVisibleBlobs.length} selected
				</button>
			</div>

			<PreviewList<Blob> items={visibleBlobs}
				thumbnailPreviewTemplate={
					(blob, maximize) => <BlobCard
						key={blob.id}
						blob={blob}
						attachBlob={attachBlob}
						deleteBlob={deleteBlob}
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

		</>
	)
}


type BlobCardProps = {
	blob: Blob
	attachBlob: (id: number) => void
	deleteBlob: (blobId: number) => void
	maximize: (blob: Blob) => void
	selectionOfBlobs: Selection<number>
}
const BlobCard = ({ blob, attachBlob, deleteBlob, maximize, selectionOfBlobs }: BlobCardProps) => {
	return (
		<div className="card flex flex-row relative">

			<div className="bg-black w-[152px] h-[152px] flex justify-center items-center">
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
					<button className="btn" onClick={() => deleteBlob(blob.id)}>Delete</button>
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
		setHideAllocatedBlobs((searchParams.get("hideAllocatedBlobs") ?? "true") === "true")
	}, [searchParams])

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