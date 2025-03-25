import { faFileArrowUp, faFileImport, faPlus, IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { UnallocatedBlobItem } from "./UnallocatedBlobs"
import { useAtomValue } from "jotai"
import { unallocatedBlobsAtom } from "../Utils/Atoms"


export type FileDropZoneProps = {
    onBlobAdded?: (files: { fileName: string; fileData: Blob }[]) => void
    onBlobAttached: (blobId: number) => void
    showUnallocatedBlobs?: boolean
}

// export const FileDropZone = ({ setFileBlobs: setFileBlobs }: FileDropZoneProps) => {
export const FileDropZone = ({ onBlobAdded, onBlobAttached, showUnallocatedBlobs }: FileDropZoneProps) => {
    const apiClient = useApiClient()

    const inputFileRef = useRef<HTMLInputElement | null>(null)
    const [openUnallocatedBlobs, setOpenUnallocatedBlobs] = useState(false)
    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom)

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

    const options: { name: string, callback: (id?: number) => void, icon: IconDefinition }[] = [
        {
            name: "Attach to this archive item",
            callback: (id) => onBlobAttached(id!),
            icon: faPlus
        }
    ]

    return (
        <div className="filedropzone">
            <input
                type='file'
                id='file'
                ref={inputFileRef}
                style={{ display: "none" }}
                onChange={onChangeFile} />
            <div draggable="true" onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
                style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
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
                        <button type="button" onClick={() => inputFileRef?.current?.click()} className="link-button">
                            Select a file to upload
                        </button>
                    </p>
                    {
                        showUnallocatedBlobs &&
                        <>
                            <i>or</i>
                            <p>
                                <button type="button" onClick={() => {setOpenUnallocatedBlobs(!openUnallocatedBlobs)}} className="link-button">
                                    Choose from unallocted heap.
                                </button>
                            </p>
                        </>
                    }
                </div>
            </div>

            <div className={`bloblistpage animate-height ${openUnallocatedBlobs ? 'open' : 'closed'}`}>
                {
                    unallocatedHeap.length === 0
                        ? <p style={{ textAlign: "center" }}>No unallocated blobs</p>
                        : unallocatedHeap.map(blob => (
                            <UnallocatedBlobItem {...blob} options={options} setSelectedUnallocated={() => { }} key={blob.id} showActions={false} />
                        ))
                }
            </div>
        </div>
    )
}