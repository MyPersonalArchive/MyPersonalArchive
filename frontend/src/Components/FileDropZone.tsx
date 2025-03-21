import { faFileArrowUp, faPlus, IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import "./FileDropZone.css"
import { UnallocatedBlobItem } from "./UnallocatedBlobs"
import { useAtomValue } from "jotai"
import { unallocatedBlobsAtom } from "../Utils/Atoms"

export type FileDropZoneProps = {
    onBlobAdded?: (files: { fileName: string; fileData: Blob }[]) => void
    onBlobAttached: (blobId: number) => void
    showUnallocatedBlobs?: boolean
}

export const FileDropZone = ({ onBlobAdded, onBlobAttached, showUnallocatedBlobs }: FileDropZoneProps) => {
    const apiClient = useApiClient()
    const inputFile = useRef<HTMLInputElement | null>(null)
    const [openUnallocatedBlobs, setOpenUnallocatedBlobs] = useState(false)
    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom)
    
    const uploadBlobs = (blobs: { fileName: string; fileData: Blob }[]): void => {
        if(onBlobAdded) {
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

        const file = event.target.files![0]
        handleFileChange([file])
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

    const options: {name: string, callback: (id?: number) => void, icon: IconDefinition}[] = [
        {
            name: "Attach to this archive item",
            callback: (id) => onBlobAttached(id!),
            icon: faPlus
        }
    ]

    return (
        <div style={{
            border: "solid 1px",
            borderColor: "lightgray",
            borderRadius: "5px",
            marginBottom: "10px",
            width: "100%"}}>
            <input
                type='file'
                id='file'
                ref={inputFile}
                style={{display: "none"}}
                onChange={onChangeFile}/>
            <div style={{margin: "10px"}}
                draggable = "true"
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}>
                <FontAwesomeIcon icon={faFileArrowUp} color="gray" size="2x" width="100%" style={{marginBottom: "5px"}} />
                <div style={{
                    display: "flex",
                    justifyContent: "center"}}>
                    <div onClick={() => inputFile?.current?.click()} 
                    style={{
                        cursor: "pointer", 
                        textDecoration: "underline", 
                        color: "blue",
                        alignContent: "center"}}>Select file</div>
                    <p style={{
                        textAlign: "center",
                        fontSize: "14px",
                        marginLeft: "5px"}}>
                        or drag and drop a file here.</p>
                    
                    
                </div>
                {showUnallocatedBlobs &&
                        <div onClick={() => setOpenUnallocatedBlobs(!openUnallocatedBlobs)} 
                            style={{
                                cursor: "pointer", 
                                textDecoration: "underline", 
                                color: "blue",
                                textAlign: "center",
                                alignContent: "center"}}>Choose from unallocted heap.</div>}
            </div>
            
                <div className={`animate-height ${openUnallocatedBlobs ? 'open' : 'closed'}`}>
                    {unallocatedHeap.length === 0 && <p style={{textAlign: "center"}}>No unallocated blobs</p>}
                    {unallocatedHeap.map(blob => (
                        <UnallocatedBlobItem {...blob} options={options} isSelected={false} setSelectedUnallocated={() => {}} key={blob.id} />
                    ))}
                    
                </div>
            
        </div>
    )
}