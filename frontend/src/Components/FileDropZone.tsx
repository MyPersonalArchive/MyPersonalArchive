import { faFileImport } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { UnallocatedBlob, unallocatedBlobsAtom } from "../Utils/Atoms"
import { BlobIdAndNumberOfPages, DimensionEnum, Preview, PreviewList } from "./PreviewList"
// import { ActionPanel } from "../Components/ActionPanel"
import { InfoPanel } from "../Components/InfoPanel"
import { SelectCheckbox, Selection, useSelection } from "../Utils/Selection"



export type FileDropZoneProps = {
    onBlobAdded?: (files: { fileName: string; fileData: Blob }[]) => void
    onBlobAttached: (blob: BlobIdAndNumberOfPages[]) => void
    showUnallocatedBlobs?: boolean
}
export const FileDropZone = ({ onBlobAdded, onBlobAttached, showUnallocatedBlobs }: FileDropZoneProps) => {
    const apiClient = useApiClient()

    const inputFileRef = useRef<HTMLInputElement | null>(null)
    const [openUnallocatedBlobs, setOpenUnallocatedBlobs] = useState(false)

    const uploadBlobs = (blobs: { fileName: string; fileData: Blob }[]): void => {
        if (onBlobAdded) {
            onBlobAdded(blobs)
            return
        }
        const formData = new FormData()
        blobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.postFormData("/api/blob/upload", formData)
    }

    const handleDrop = (event: any) => {
        event.preventDefault()
        const { files } = event.dataTransfer
        if (files.length > 0) {
            handleFileChange(files)
        }
    }

    const onChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        event.preventDefault()

        const files = event.target.files ?? []
        handleFileChange([...files])
    }

    const handleFileChange = (files: File[]) => {
        if (!files) {
            return;
        }

        const filePromises = [];

        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader()

            const filePromise = new Promise<{ fileName: string, fileData: Blob }>((resolve, reject) => {
                reader.onload = () => {
                    resolve({
                        fileName: files[i].name,
                        fileData: new Blob([files[i]], { type: files[i].type })
                    })
                }

                reader.onerror = () => {
                    reject(new Error('Error reading file'));
                }

                reader.readAsDataURL(files[i])
            });

            filePromises.push(filePromise)
        }

        Promise.all(filePromises)
            .then((fileDataArray) => {
                uploadBlobs(fileDataArray)
            })
            .catch((error) => {
                console.error('Error reading files:', error)
            })
    }

    const handleDragOver = (event: any) => {
        event.preventDefault()

    }

    const handleDragStart = (event: any) => {
        event.dataTransfer.setData("text/plain", event.target.id)
    }

    return (
        <div className="input is-wrapper w-full">
            <input type='file' multiple
                id='file'
                ref={inputFileRef}
                style={{ display: "none" }}
                onChange={onChangeFile}
            />
            <div draggable="true" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div style={{
                    height: showUnallocatedBlobs ? "7.5em" : "4.5em",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                }}>
                    <FontAwesomeIcon icon={faFileImport} color="gray" size="5x" />
                </div>
                <div style={{ textAlign: "center", flexGrow: 1 }}>
                    <p>
                        Drag and drop a file here
                    </p>
                    <i>or</i>
                    <p>
                        <button className="link" type="button" onClick={() => inputFileRef?.current?.click()}>
                            Select a file to upload
                        </button>
                    </p>
                    {
                        showUnallocatedBlobs &&
                        <>
                            <i>or</i>
                            <p>
                                <button className="link" type="button" onClick={() => { setOpenUnallocatedBlobs(!openUnallocatedBlobs) }}>
                                    Choose from unallocted heap.
                                </button>
                            </p>
                        </>
                    }
                </div>
            </div>
            <UnallocatedBlobsDialog openDialog={openUnallocatedBlobs} onBlobAttached={onBlobAttached} onCloseDialog={() => setOpenUnallocatedBlobs(false)} />
        </div>
    )
}


type UnallocatedBlobsDialogProps = {
    openDialog: boolean,
    onCloseDialog: () => void
    onBlobAttached: (blob: BlobIdAndNumberOfPages[]) => void
}
const UnallocatedBlobsDialog = ({ openDialog, onCloseDialog, onBlobAttached }: UnallocatedBlobsDialogProps) => {
    if (!openDialog) return null

    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom)

    const selectionOfBlobs = useSelection<number>(new Set(unallocatedHeap.map(blob => blob.id)))
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
    useEffect(() => {
        if (selectAllCheckboxRef.current !== null) {
            selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.areOnlySomeItemsSelected
            selectAllCheckboxRef.current.checked = selectionOfBlobs.areAllItemsSelected
        }
    }, [selectionOfBlobs.selectedItems, unallocatedHeap])

    const blobSelected = (blobIds: number[]) => {
        const blobs = unallocatedHeap.filter(blob => blobIds.includes(blob.id)).map(blob => ({ id: blob.id, numberOfPages: blob.pageCount }))
        onBlobAttached(blobs)
        onCloseDialog()
    }

    return (
        <div className="dimmedBackground" style={{ zIndex: 1 }} onClick={onCloseDialog}>
            <div className="overlay bloblistpage" onClick={event => event.stopPropagation()}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "95%" }}>

                        <label>
                            <input ref={selectAllCheckboxRef} type="checkbox"
                                checked={selectionOfBlobs.areAllItemsSelected}
                                onChange={() => selectionOfBlobs.areAllItemsSelected
                                    ? selectionOfBlobs.clearSelection()
                                    : selectionOfBlobs.selectAllItems()
                                } />
                            <span className="spacer-1ex" />
                            Select all
                        </label>
                        <span className="spacer-1em" />
                        <button className="btn"
                            disabled={selectionOfBlobs.areNoItemsSelected}
                            onClick={() => blobSelected(Array.from(selectionOfBlobs.selectedItems))}
                        >
                            Add selected blobs
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
                                        <button className="btn" onClick={() => blobSelected([blob.id!])}>Add blob</button>
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
        </div>
    )
}
