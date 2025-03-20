import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { useApiClient } from "../Utils/useApiClient"
import { tagsAtom } from "../Utils/Atoms"
import { DimensionEnum, Preview } from "../Components/Preview"

type CreateResponse = {
    id: number
}

export const ArchiveItemNewPage = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [localBlobs, setLocalBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const [blobsFromUnallocated, setBlobsFromUnallocated] = useState<number[]>([])
    const allTags = useAtomValue(tagsAtom)

    const navigate = useNavigate()
    const apiClient = useApiClient()

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const formData = new FormData()
        const createRequest = {
            title, 
            tags,
            blobsFromUnallocated
        }

        formData.append("rawRequest", JSON.stringify(createRequest))

        localBlobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.postFormData<CreateResponse>("/api/archive/create", formData)
        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
        setLocalBlobs([...localBlobs, ...blobs])
    }

    const removeBlob = (fileName: string) => {
        setLocalBlobs(localBlobs.filter(blob => blob.fileName !== fileName))
    }

    const attachUnallocatedBlobs = (blobId: number) => {
        setBlobsFromUnallocated(blobsFromUnallocated => [...blobsFromUnallocated, blobId])
    }

    return (
        <>
            <h1>
                New archive item {title}
            </h1>
            <form onSubmit={save}>
                <table>
                    <tbody>
                        <tr>
                            <td>
                                <label htmlFor="title">Title</label>
                            </td>
                            <td>
                                <input type="text" id="title" placeholder="" autoFocus required value={title} data-1p-ignore onChange={event => setTitle(event.target.value)}
                                />
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <label htmlFor="tags">Tags</label>
                            </td>
                            <td>
                                <TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={allTags} />
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td >
                                <FileDropZone onBlobAdded={addFileBlobs} onBlobAttached={attachUnallocatedBlobs} showUnallocatedBlobs={true}/>

                                {/* <div style={{ display: "flex", flexWrap: "wrap" }}>
                                    {fileBlobs?.map((blob, ix) => (
                                        <div key={ix} style={{ margin: "5px" }}>
                                            <LocalFilePreview key={blob.fileName} removeBlob={removeBlob} fileName={blob.fileName} blob={blob.fileData}>
                                            </LocalFilePreview>
                                        </div>
                                    ))}
                                </div> */}

                                <div style={{display: "flex", flexWrap: "wrap"}}>
                                    {blobsFromUnallocated.map((blobId) => (
                                        <Preview blobId={blobId} key={blobId} maximizedDimension={DimensionEnum.large} minimizedDimension={DimensionEnum.small} />
                                    ))}
                                    {localBlobs?.map((blob, ix) => (
                                        <div key={ix} style={{margin: "5px"}}>
                                            <LocalFilePreview  key={blob.fileName}  removeBlob={removeBlob}  fileName={blob.fileName} blob={blob.fileData}>
                                            </LocalFilePreview>
                                        </div> 
                                    ))}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>
                                <button type="button" onClick={back}>
                                    Back
                                </button>
                                <button type="submit">
                                    Save
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>
        </>
    )
}
