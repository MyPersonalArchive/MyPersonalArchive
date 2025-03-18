import { Preview, DimensionEnum } from "../Components/Preview"
import { faTrashCan, IconDefinition } from "@fortawesome/free-regular-svg-icons"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { useSignalR, SignalRMessage } from "../Utils/useSignalR"
import "./AssignUnallocatedBlobsPage.scss"
import { DropdownButton } from "../Components/DropdownButton"
import { faPlus } from "@fortawesome/free-solid-svg-icons"

type UnallocatedBlobResponse = {
    total: number
    blobs: UnallocatedBlob[]
}

type UnallocatedBlob = {
    id: number
    fileName: string
    fileSize: number
    pageCount: number
    uploadedAt: Date
    uploadedByUser: string
}

export const AssignUnallocatedBlobsPage = () => {
    const apiClient = useApiClient()
    const navigate = useNavigate()
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
    
    const [unallocatedHeap, setUnallocatedHeap] = useState<UnallocatedBlob[]>([])
    const [assignedHeap, setAssignedHeap] = useState<number[]>([])

    useSignalR((message: SignalRMessage) => {
        switch(message.data) {
            case "OrphanHeapUpdated": {
                apiClient.get<UnallocatedBlobResponse>("/api/blob/orphanHeap")
                    .then(response => {
                        setUnallocatedHeap(response.blobs)
                })
                break
            }
        }
    })

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = assignedHeap.length > 0 && assignedHeap.length < unallocatedHeap.length
        }
    }, [assignedHeap])

    useEffect(() => {
        apiClient.get<UnallocatedBlobResponse>("/api/blob/orphanHeap")
            .then(response => setUnallocatedHeap(response.blobs))
    }, [])

    const selectedUnallocated = (blobId: number, added: boolean) => {
        if (added) {
            setAssignedHeap([...assignedHeap, blobId])
            
        } else {
            setAssignedHeap(assignedHeap.filter(id => id !== blobId))
        }
    }

    const deleteAllSelected = () => {
        if (assignedHeap.length === 0) return

        deleteBlobs(assignedHeap)
        setAssignedHeap([])
    }

    const deleteBlobs = (blobIds: number[]) => {
        apiClient.delete("/api/blob/delete", { blobIds }).then(() => {
            console.log("Deleted", blobIds)
            setUnallocatedHeap(unallocatedHeap.filter(blob => !blobIds.includes(blob.id)))
        })
    }

    const createArchiveItemFromSelected = () => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: assignedHeap }).then(newArchiveItemId => {
            setAssignedHeap([])
            navigate(`/archive/edit/${newArchiveItemId}`)
        })
    }

    const selectAllUnallocated = (checked: boolean) => {
        if (checked) {
            setAssignedHeap(unallocatedHeap.map(blob => blob.id))
        } else {
            setAssignedHeap([])
        }
    }

    const options: {name: string, callback: () => void, icon: IconDefinition}[] = [
        {
            name: "Create from all selected",
            callback: () => createArchiveItemFromSelected(),
            icon: faPlus
        },
        {
            name: "Delete all selected",
            callback: () => deleteAllSelected(),
            icon: faTrashCan
        }
    ]

    return (
        <>
            <h2>Assign unallocated blobs</h2>
            <div>
                <button onClick={() => navigate("/archive/list")}>Back</button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "95%" }}>
                    <input ref={selectAllCheckboxRef} type="checkbox"  onChange={(e) => selectAllUnallocated(e.currentTarget.checked)}></input>
                    <span style={{ marginLeft: "10px", marginRight: "10px" }}>Select all</span>
                    <DropdownButton options={options} disabled={assignedHeap.length === 0}></DropdownButton>
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column",  }}>
            {
                unallocatedHeap?.map(blob => <UnallocatedBlobItem 
                    key={blob.id} 
                    {...blob} 
                    setSelectedUnallocated={selectedUnallocated} 
                    isSelected={assignedHeap.includes(blob.id)}
                    onDelete={(blobId) => deleteBlobs([blobId])} />)
            }
            {
                unallocatedHeap?.length === 0 && <div>No unallocated blobs</div>
            }
            </div>
        </>
    )
}

type UnallocatedBlobItemProps = UnallocatedBlob & {
    setSelectedUnallocated: (blobId: number, added: boolean) => void
    onDelete: (blobId: number) => void
    isSelected?: boolean
}

const UnallocatedBlobItem = ({id, fileName, fileSize, uploadedAt, uploadedByUser, isSelected, pageCount, setSelectedUnallocated, onDelete}: UnallocatedBlobItemProps) => {
    const uploadedAtDate = new Date(uploadedAt)
    const navigate = useNavigate()
    const apiClient = useApiClient()

    const options: {name: string, callback: () => void, icon: IconDefinition}[] = [
        {
            name: "Create new archive item",
            callback: () => attachToNewArchiveItem(),
            icon: faPlus
        },
        {
            name: "Delete",
            callback: () => onDelete(id),
            icon: faTrashCan
        }
    ]

    const sizeToHumanReadable = (size: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
        const value = size / Math.pow(1024, index);
        return `${value.toFixed(2)} ${units[index]}`;
    }

    const getDateString = (): string => {
        const formattedDate = new Intl.DateTimeFormat('no-NB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).format(uploadedAtDate);

          return formattedDate
    }

    const attachToNewArchiveItem = () => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] }).then(newArchiveItemId => {
            navigate(`/archive/edit/${newArchiveItemId}`)
        })
    }

    return (
        <div style={{  
            minHeight: "100px", 
            width: "95%", 
            margin: "5px", 
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.1), 1px 2px 2px rgba(0, 0, 0, 0.1)",
            borderRadius: "5px",
            border: "1px solid lightgray" }} 
            className="grid">
            <div style={{gridArea: "image", background: "#f5f5f5"}}>
                <Preview 
                    blobId={id} 
                    numberOfPages={pageCount} 
                    showPageNavigationOnMinized={false}
                    maximizedDimension={DimensionEnum.large} 
                    minimizedDimension={DimensionEnum.xsmall}>
                </Preview>
            </div>
            <div style={{ display: "flex", margin: "5px", gridArea: "information" }}>
                <div style={{ marginLeft: "5px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>{fileName}</div>
                    <div style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "5px", width: "100%" }}>
                        <div>{getDateString()}</div>
                        <div>{uploadedByUser}</div>
                        <div >{sizeToHumanReadable(fileSize)}</div>
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gridArea: "actions", padding: "10px" }}>
                    <input 
                    style={{alignSelf: "end"}}
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => setSelectedUnallocated(id, e.currentTarget.checked)}></input>
                    <div style={{ display: "flex", alignSelf: "end" }}>
                        <DropdownButton options={options}></DropdownButton>
                    </div>
                    
                </div>
        </div>
    )
}