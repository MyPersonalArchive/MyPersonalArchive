import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { useApiClient } from "../Utils/useApiClient"
import { tagsAtom } from "../Utils/Atoms"
import { DimensionEnum, LegacyPreview } from "../Components/LegacyPreview"
import { RoutePaths } from "../RoutePaths"

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
        navigate(RoutePaths.Archive)
    }

    const back = () => {
        navigate(RoutePaths.Archive)
    }

    const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
        setLocalBlobs([...localBlobs, ...blobs])
    }

    const removeBlob = (fileName: string) => {
        setLocalBlobs(localBlobs.filter(blob => blob.fileName !== fileName))
    }

    const attachUnallocatedBlobs = (blobIds: number[]) => {
        setBlobsFromUnallocated(blobsFromUnallocated => [...blobsFromUnallocated, ...blobIds])
    }

    const removeUnallocatedBlob = (blobId: number) => {
        setBlobsFromUnallocated(blobsFromUnallocated => blobsFromUnallocated.filter(id => id !== blobId))
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
                                <input className="input" type="text"
                                    id="title" placeholder="" autoFocus required data-1p-ignore
                                    value={title}
                                    onChange={event => setTitle(event.target.value)}
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

                                <div style={{display: "flex", flexWrap: "wrap"}}>
                                    {blobsFromUnallocated.map((blobId) => (
                                        <LegacyPreview blobId={blobId} key={blobId} maximizedDimension={DimensionEnum.large} minimizedDimension={DimensionEnum.small} onRemove={removeUnallocatedBlob}/>
                                    ))}
                                    {localBlobs?.map((blob) => (
                                        <div key={blob.fileName} style={{marginLeft: "5px"}}>
                                            <LocalFilePreview removeBlob={removeBlob}  fileName={blob.fileName} blob={blob.fileData}/>
                                        </div> 
                                    ))}
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>
                                <button className="button secondary" type="button" onClick={back}>
                                    Back
                                </button>
                                <button className="button primary" type="submit">
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
