import "./BlobListPage.css"
import { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { formatDate, formatFileSize } from "../Utils/formatUtils"
import { FileDropZone } from "../Components/FileDropZone"
import { useSelection, Selection, SelectCheckbox } from "./useSelection"


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
            <h1>Blobs</h1>
            <div className="bloblistpage form">
                <FileDropZone onBlobAttached={() => { /* //TODO: what? */ }} />

                <div>
                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline" }}>
                        <label>
                            <input ref={selectAllCheckboxRef} type="checkbox"
                                checked={selectionOfBlobs.areAllItemsSelected}
                                onChange={() => selectionOfBlobs.areAllItemsSelected
                                    ? selectionOfBlobs.clearSelection()
                                    : selectionOfBlobs.selectAllItems()
                            }/>
                            <span className="spacer-1ex" />
                            Select all
                        </label>
                        <span className="spacer-1em" />

                        <button className="button secondary"
                            disabled={selectionOfBlobs.areNoItemsSelected}
                            onClick={createArchiveItemFromSelectedUnallocatedBlobs}
                        >
                            Create from all selected
                        </button>
                        <button className="button secondary"
                            disabled={selectionOfBlobs.areNoItemsSelected}
                            onClick={deleteSelectedUnallocatedBlobs}
                        >
                            Delete all selected
                        </button>
                    </div>
                </div>

                <PreviewList<UnallocatedBlob> blobs={unallocatedHeap}
                    containerStyle={{ display: "flex", flexDirection: "column", justifyContent: "center" }}
                    thumbnailPreviewTemplate={
                        (blob, maximize) =>
                            <div key={blob.id} className="box grid">
                                <div style={{ gridArea: "image", background: "whitesmoke", padding: "5px" }}>
                                    <Preview key={blob.id} blob={blob} dimension={DimensionEnum.xsmall}
                                        onMaximize={maximize} />
                                </div>

                                <div style={{ gridArea: "information" }}>
                                    <InfoPanel blob={blob} />
                                </div>

                                <div style={{ gridArea: "actions" }}>
                                    <ActionPanel blob={blob} selection={selectionOfBlobs}>
                                        <button className="button secondary" onClick={() => attachBlob(blob.id)}>Add</button>
                                        <button className="button secondary" onClick={() => deleteBlobs([blob.id])}>Delete</button>
                                    </ActionPanel>
                                </div>
                            </div>

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


type InfoPanelProps = {
    blob: UnallocatedBlob
}
const InfoPanel = ({ blob }: InfoPanelProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "5px 10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>{blob.fileName}</div>
            <div style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "5px" }}>
                <div>{formatDate(new Date(blob.uploadedAt))}</div>
                <div>{blob.uploadedByUser}</div>
                <div>{formatFileSize(blob.fileSize)}</div>
            </div>
        </div>
    )
}

type ActionPanelProps = React.PropsWithChildren & {
    blob: UnallocatedBlob
    selection: Selection<number>
}
const ActionPanel = ({ blob, selection, children }: ActionPanelProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "0 10px", justifyContent: "space-between", height: "100%" }}>
            <SelectCheckbox selection={selection} item={blob.id} />
            <div>
                {children}
            </div>
        </div>
    )
}



