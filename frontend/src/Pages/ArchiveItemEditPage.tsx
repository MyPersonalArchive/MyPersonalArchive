import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { LegacyPreview } from "../Components/LegacyPreview"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { tagsAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { RoutePaths } from "../RoutePaths"

type GetResponse = {
    id: number
    title: string
    tags: string[]
    blobs: BlobResponse[]
}

type BlobResponse = {
    id: number
    numberOfPages: number
}


export const ArchiveItemEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [blobs, setBlobs] = useState<BlobResponse[]>([])
    const [localBlobs, setLocalBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const [removedBlobs, setRemovedBlobs] = useState<number[]>([])

    const params = useParams()

    const allTags = useAtomValue(tagsAtom)
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<GetResponse>("/api/archive/get", { id: params.id })
            .then(item => {
                setId(item.id)
                setTitle(item.title)
                setTags(item.tags)
                setBlobs(item.blobs)
            })
    }, [])

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const formData = new FormData()
        const updateRequest = {
            id: id!,
            title: title!,
            tags,
            blobsFromUnallocated: blobs.map(blob => blob.id),
            removedBlobs
        }

        formData.append("rawRequest", JSON.stringify(updateRequest))

        localBlobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.putFormData("/api/archive/Update", formData)

        navigate(RoutePaths.Archive)
    }

    const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
        setLocalBlobs([...localBlobs, ...blobs])
    }

    const removeBlob = (fileName: string) => {
        setLocalBlobs(localBlobs.filter(blob => blob.fileName !== fileName))
    }

    const back = () => {
        navigate(-1)
    }

    const attachUnallocatedBlobs = (blobIds: number[]) => {
        blobIds.map(blobId => {
            setBlobs(blobs => [...blobs, { id: blobId, numberOfPages: 1 }])
            setRemovedBlobs(removedBlobs => removedBlobs.filter(id => id !== blobId))
        })
    }

    const removeUnallocatedBlob = (blob: BlobResponse) => {
        setBlobs(existingBlobs => existingBlobs.filter(x => x.id !== blob.id))
        setRemovedBlobs(removedBlobs => [...removedBlobs, blob.id])
    }

    return (
        <>
            <h1>
                Edit item
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
                                    id="title" placeholder="" autoFocus data-1p-ignore
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
                                <TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} htmlId="tags" />
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>
                                <FileDropZone onBlobAdded={addFileBlobs} onBlobAttached={attachUnallocatedBlobs} showUnallocatedBlobs={true} />
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td>
                                <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
                                    <PreviewList<BlobResponse> blobs={blobs}
                                        containerStyle={{ display: "flex", flexDirection: "row", justifyContent: "center" }}
                                        thumbnailPreviewTemplate={
                                            (blob, maximize) =>
                                                <Preview key={blob.id} blob={blob} dimension={DimensionEnum.small} showPageNavigation={false}
                                                    onRemove={removeUnallocatedBlob}
                                                    onMaximize={() => maximize(blob)} />
                                        }
                                        maximizedPreviewTemplate={
                                            (blob, minimize) =>
                                                <Preview key={blob.id} blob={blob} dimension={DimensionEnum.large}
                                                    onRemove={removeUnallocatedBlob}
                                                    onMinimize={() => minimize()} />
                                        }
                                    />

                                    {
                                        localBlobs.map((blob) => (
                                            <div key={blob.fileName} style={{ marginLeft: "5px" }}>
                                                <LocalFilePreview removeBlob={removeBlob} fileName={blob.fileName} blob={blob.fileData} />
                                            </div>
                                        ))
                                    }
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
