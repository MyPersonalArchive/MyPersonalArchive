import { useRef, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { FileDropZone } from "../Components/FileDropZone"
import { useSelection } from "../Utils/Selection"
import { BlobListItem } from "../Components/BlobListItem"
import { createQueryString } from "../Utils/createQueryString"


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

			<div className="stack-horizontal to-the-left my-4">
				<label>
					<input type="checkbox" checked={true} disabled />
					Show only unallocated blobs
					<div className="text-green-600 bg-gray-900 font-mono text-sm w-full p-2">//TODO: implement this filter</div>
				</label>
			</div>

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
					(blob, maximize) => <BlobListItem
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