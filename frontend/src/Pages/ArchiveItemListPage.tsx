import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../Utils/Atoms"
import { createQueryString } from "../Utils/createQueryString"
import { FileDropZone } from "../Components/FileDropZone"
import { faFile, IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFileImage, faFileLines, faFilePdf, faFileWord } from "@fortawesome/free-regular-svg-icons"

type ListResponse = {
    id: number
    title: string
    tags: string[]
    createdAt: string
}

type ArchiveItem = {
    id: number
    title: string
    tags: string[]
    createdAt: Date
}

type OrphanHeapResponse = {
    total: number
    blobs: OrphanBlob[]
}

type OrphanBlob = {
    id: number
    fileName: string
    fileSize: number
    uploadedAt: Date
}

export const ArchiveItemListPage = () => {
    const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>()
    const [searchParams] = useSearchParams()

    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        const payload = {
            title: searchParams.get("title"),
            tags: searchParams.getAll("tags")
        }
        apiClient.get<ListResponse[]>("/api/archive/list", payload)
            .then(response => setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt) }))))
    }, [searchParams])


    useSignalR((message: SignalRMessage) => {
        switch (message.data) {
            case "ArchiveItemCreated":
            case "ArchiveItemUpdated":
            case "ArchiveItemDeleted": {
                apiClient.get<ListResponse[]>("/api/archive/list")
                    .then(response => {
                        setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt) })))
                    })
                break
            }
        }
    })

    const newArchiveItem = () => {
        navigate("/archive/new")
    }

    const uploadBlobs = (blobs: { fileName: string; fileData: Blob }[]): void => {
        const formData = new FormData()
        blobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.postFormData("/api/blob/upload", formData)
    }

    return (
        <>
            <h1>Archive</h1>
            <button onClick={() => newArchiveItem()}>Add item</button>
            <Filter />
            <FileDropZone setFileBlobs={uploadBlobs}></FileDropZone>
            <UnAllocatedBlobHeap />
            <table style={{ width: "100%" }}>
                <thead>
                    <tr>
                        <td>Title</td>
                        <td>Tags</td>
                        <td>Created</td>
                    </tr>
                </thead>
                <tbody>
                    {
                        archiveItems?.map(item => <Row key={item.id} archiveItem={item} />)
                    }
                </tbody>
            </table>
            <button onClick={() => newArchiveItem()}>Add item</button>
        </>
    )
}


type RowProps = {
    archiveItem: ArchiveItem
}
const Row = ({ archiveItem }: RowProps) => {
    return (
        <tr>
            <td>
                <Link to={`/archive/edit/${archiveItem.id}`}>{archiveItem.title}</Link>
            </td>
            <td>
                {
                    archiveItem.tags.map((tag, ix) => <span key={ix} className="tag">{tag}</span>)
                }
            </td>
            <td>
                {
                    archiveItem.createdAt.toLocaleDateString()
                }
            </td>
        </tr>
    )
}

const OrphanBlobItem = ({ fileName, fileSize, uploadedAt }: OrphanBlob) => {
    const uploadedAtDate = new Date(uploadedAt)

    const sizeToHumanReadable = (size: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
        const value = size / Math.pow(1024, index);
        return `${value.toFixed(2)} ${units[index]}`;
    }

    const getIconType = (fileName: string): IconDefinition => {
        const extension = fileName.split(".").pop()
        switch (extension) {
            case "pdf":
                return faFilePdf
            case "jpg":
            case "jpeg":
            case "png":
                return faFileImage
            case "doc":
            case "docx":
                return faFileWord
            case "txt":
                return faFileLines
            default:
                return faFile
        }
    }

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid lightgray",
            borderRadius: "4px",
            margin: "5px",
            minWidth: "200px"
        }}>
            <div style={{ display: "flex", alignItems: "center", margin: "5px" }}>
                <FontAwesomeIcon icon={getIconType(fileName)} color="gray" size="2x" />
                <div style={{ marginLeft: "5px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>{fileName}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "gray", marginTop: "5px", width: "100%" }}>
                        <div>{uploadedAtDate.toLocaleDateString()}</div>
                        <div >{sizeToHumanReadable(fileSize)}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const UnAllocatedBlobHeap = () => {
    const apiClient = useApiClient()
    const navigate = useNavigate()

    const [orphanHeap, setOrphanHeap] = useState<OrphanBlob[]>([])
    const [total, setTotal] = useState(0)

    useSignalR((message: SignalRMessage) => {
        switch(message.data) {
            case "OrphanHeapUpdated": {
                apiClient.get<OrphanHeapResponse>("/api/blob/orphanHeap", { limit: 10 })
                    .then(response => {
                        setOrphanHeap(response.blobs)
                        setTotal(response.total)
                })
                break
            }
        }
    })

    useEffect(() => {
        apiClient.get<OrphanHeapResponse>("/api/blob/orphanHeap", { limit: 10 })
            .then(response => {
                setOrphanHeap(response.blobs)
                setTotal(response.total)
            })
    }, [])

    const unallocatedBlobPage = () => {
        navigate("/archive/unallocated")
    }

    return (
        <div style={{ display: "flex", flexDirection: "row", width: "100%", overflow: "auto" }}>
            <button onClick={() => unallocatedBlobPage()}>Se all ({total}) unallocated</button>
            <div style={{ display: "flex", flexDirection: "row",  }}>
            {
                orphanHeap.map(blob => <OrphanBlobItem key={blob.id} {...blob} />)
            }
            </div>
        </div>
    )
}

const Filter = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const allTags = useAtomValue(tagsAtom)
    const [searchParams] = useSearchParams()

    const navigate = useNavigate()

    useEffect(() => {
        setTitle(searchParams.get("title") ?? "")
        setTags(searchParams.getAll("tags"))        
    }, [])

    const search = () => {
        navigate({
            search: createQueryString({ title, tags: tags.map(tag => tag.trim()) }, { skipEmptyStrings: true })
        })
    }

    const reset = () => {
        setTitle("")
        setTags([])
    }

    return (
        <div>
            <input type="text"
                placeholder="Search by title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                onKeyDown={event => event.key === "Enter" ? search() : null} />

            <TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} />

            <button onClick={search}>Search</button>
            <button onClick={reset}>Reset</button>
        </div>
    )
}