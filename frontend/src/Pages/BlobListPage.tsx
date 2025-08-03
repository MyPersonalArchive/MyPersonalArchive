import { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { FileDropZone } from "../Components/FileDropZone"
import { useSelection } from "../Utils/Selection"
import { BlobListItem } from "../Components/BlobListItem"


export const BlobListPage = () => {
    const apiClient = useApiClient()
    const navigate = useNavigate()

    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom)

    const selectionOfBlobs = useSelection<number>(new Set(unallocatedHeap.map(blob => blob.id)))
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (selectAllCheckboxRef.current !== null) {
            selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.areOnlySomeItemsSelected
            selectAllCheckboxRef.current.checked = selectionOfBlobs.areAllItemsSelected
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
        <>
            <h1 className="heading-2">
                Unallocated blobs
            </h1>
            <div className="bloblistpage">
                <FileDropZone onBlobAttached={() => { /* //TODO: what? */ }} />

                <div>
                    <div className="push-right">
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
                </div>

                <PreviewList<UnallocatedBlob> blobs={unallocatedHeap}
                    containerClassName="flex flex-col justify-center gap-1"
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
                            <Preview key={blob.id} blob={blob} dimension={DimensionEnum.large}
                                onMinimize={minimize} />
                    }
                />

            </div>
        </>
    )
}
