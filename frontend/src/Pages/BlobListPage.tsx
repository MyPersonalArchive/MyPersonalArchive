import "./BlobListPage.css"
import { UnallocatedBlobItem } from "../Components/UnallocatedBlobs"
import { IconDefinition, faPlus, faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { DropdownButton } from "../Components/DropdownButton"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { unallocatedBlobsAtom } from "../Utils/Atoms"

export const BlobListPage = () => {
    const apiClient = useApiClient()
    const navigate = useNavigate()
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
    
    const unallocatedHeap = useAtomValue(unallocatedBlobsAtom);

    const [assignedHeap, setAssignedHeap] = useState<number[]>([])

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.indeterminate = assignedHeap.length > 0 && assignedHeap.length < unallocatedHeap.length
        }
    }, [assignedHeap])

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
        apiClient.delete("/api/blob/delete", { blobIds })
    }

    const createArchiveItemFromSelected = () => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: assignedHeap }).then(newArchiveItemId => {
            setAssignedHeap([])
            navigate(`/archive/edit/${newArchiveItemId}`)
        })
    }

    const attachBlob = (id: number) => {
        apiClient.get<number>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] }).then(newArchiveItemId => {
            navigate(`/archive/edit/${newArchiveItemId}`)
        })
    }

    const selectAllUnallocated = (checked: boolean) => {
        if (checked) {
            setAssignedHeap(unallocatedHeap.map(blob => blob.id!))
        } else {
            setAssignedHeap([])
        }
    }

    const selectAllOptions: {name: string, callback: (id?: number) => void, icon: IconDefinition}[] = [
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

    const options: {name: string, callback: (id?: number) => void, icon: IconDefinition}[] = [
        {
            name: "Create new archive item",
            callback: (id) => attachBlob(id!),
            icon: faPlus
        },
        {
            name: "Delete",
            callback: (id) => deleteBlobs([id!]),
            icon: faTrashCan
        }
    ]

    return (
        <div className="bloblistpage form">
            <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", width: "95%" }}>
                    <input ref={selectAllCheckboxRef} type="checkbox"  onChange={(e) => selectAllUnallocated(e.currentTarget.checked)}/>
                    <span style={{ marginLeft: "10px", marginRight: "10px" }}>Select all</span>
                    <DropdownButton options={selectAllOptions} disabled={assignedHeap.length === 0}></DropdownButton>
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column",  }}>
            {
                unallocatedHeap?.map(blob => <UnallocatedBlobItem 
                    key={blob.id} 
                    {...blob} 
                    showActions={false}
                    setSelectedUnallocated={selectedUnallocated} 
                    isSelected={assignedHeap.includes(blob.id!)}
                    options={options} />)
            }
            {
                unallocatedHeap?.length === 0 && <div>No unallocated blobs</div>
            }
            </div>
        </div>
    )
}