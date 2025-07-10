import "./BlobListPage.css"
import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { formatDate, formatFileSize } from "../Utils/formatUtils"
import { FileDropZone } from "../Components/FileDropZone"

export const BlobListPage = () => {
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
    const apiClient = useApiClient()

    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom);
    const [selectedUnallocatedBlobs, setSelectedUnallocatedBlobs] = useState<Set<number>>(new Set())

    const navigate = useNavigate()

    useEffect(() => {
        if (selectAllCheckboxRef.current !== null) {
            selectAllCheckboxRef.current.indeterminate = selectedUnallocatedBlobs.size > 0 && selectedUnallocatedBlobs.size < unallocatedHeap.length
        }
    }, [selectedUnallocatedBlobs])


    const deleteSelectedUnallocatedBlobs = () => {
        if (selectedUnallocatedBlobs.size === 0) return

        deleteBlobs(Array.from(selectedUnallocatedBlobs))
        setSelectedUnallocatedBlobs(new Set())
    }

    const deleteBlobs = (blobIds: number[]) => {
        apiClient.delete("/api/blob/delete", { blobIds })
    }

    const createArchiveItemFromSelectedUnallocatedBlobs = () => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: Array.from(selectedUnallocatedBlobs) })
            .then(newArchiveItemId => {
                setSelectedUnallocatedBlobs(new Set())
                navigate(`/archive/edit/${newArchiveItemId}`)
            })
    }

    const attachBlob = (id: number) => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] })
            .then(newArchiveItemId => {
                navigate(`/archive/edit/${newArchiveItemId}`)
            })
    }

    const selectAllUnallocatedBlobs = (checked: boolean) => {
        if (checked) {
            setSelectedUnallocatedBlobs(new Set(unallocatedHeap.map(blob => blob.id!)))
        } else {
            setSelectedUnallocatedBlobs(new Set())
        }
    }

    return (
        <div className="bloblistpage form">
            <FileDropZone onBlobAttached={() => { /* //TODO: what? */ }} />

            <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "95%" }}>
                    <label>
                        <input ref={selectAllCheckboxRef} type="checkbox"
                            checked={selectedUnallocatedBlobs.size === unallocatedHeap.length}
                            onChange={(e) => selectAllUnallocatedBlobs(e.currentTarget.checked)}
                        />
                        <span className="spacer-1ex" />

                        Select all
                    </label>
                    <span className="spacer-1em" />

                    <button className="button secondary"
                        disabled={selectedUnallocatedBlobs.size === 0}
                        onClick={createArchiveItemFromSelectedUnallocatedBlobs}
                    >
                        Create from all selected
                    </button>
                    <button className="button secondary"
                        disabled={selectedUnallocatedBlobs.size === 0}
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
                                <FileInfo blob={blob} />
                            </div>

                            <div style={{ gridArea: "actions" }}>
                                <div style={{ display: "flex", flexDirection: "column", padding: "0 10px", justifyContent: "space-between", height: "100%" }}>
                                    <input className="input" type="checkbox"
                                        style={{ alignSelf: "end" }}
                                        checked={selectedUnallocatedBlobs.has(blob.id)}
                                        onChange={() =>
                                            setSelectedUnallocatedBlobs(set => set.has(blob.id)
                                                ? set.difference(new Set([blob.id]))
                                                : set.union(new Set([blob.id])))
                                        }
                                    />
                                    <div>
                                        <button className="button secondary" onClick={() => attachBlob(blob.id!)}>Add</button>
                                        <button className="button secondary" onClick={() => deleteBlobs([blob.id!])}>Delete</button>
                                    </div>
                                </div>
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
    )
}

const FileInfo = ({ blob }: { blob: UnallocatedBlob }) => {
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