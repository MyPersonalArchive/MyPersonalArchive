import { useEffect, useReducer, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { tagsAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { RoutePaths } from "../RoutePaths"
import { availableMetadataTypes } from "../Components/Metadata/availableMetadataTypes"
import { metadataTypesReducer } from '../Components/Metadata/metadataTypesReducer'
import React from "react"

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

    const allTags = useAtomValue(tagsAtom)

    const [metadataTypes, setMetadataTypes] = useState(availableMetadataTypes.map(({ name, path, component }) => ({ name, path, component, isVisible: false })))
    const [metadataRootState, metadataStateDispatch] = useReducer(metadataTypesReducer(availableMetadataTypes), availableMetadataTypes.reduce((acc, { path, empty }) => ({ [path]: {...empty}, ...acc }), {} /* TODO: load initial state here */))

    const params = useParams()
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

        const metadataStateToSave = prepareMetadataForSave(metadataRootState, metadataTypes)

        const formData = new FormData()
        const updateRequest = {
            id: id!,
            title: title!,
            tags,
            blobsFromUnallocated: blobs.map(blob => blob.id),
            removedBlobs,
            metadata: metadataStateToSave
        }

        formData.append("rawRequest", JSON.stringify(updateRequest))

        localBlobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.putFormData("/api/archive/Update", formData)

        navigate(RoutePaths.Archive)
    }

    const prepareMetadataForSave = (metadataState: any, metadata: { path: string, isVisible: boolean }[]) => {
        const metadataStateToSave = {} as any
        metadata
            .filter(({ isVisible }) => isVisible)
            .forEach(({ path }) => { metadataStateToSave[path] = metadataState[path] })
        return metadataStateToSave
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
                            <td colSpan={2}>
                                Include metadata for
                                &nbsp;
                                {
                                    metadataTypes.map(({ name, isVisible }) => (
                                        <label key={name}>
                                            <input type="checkbox" id={name} checked={isVisible} onChange={() => { setMetadataTypes(metadata => metadata.map(item => item.name === name ? { ...item, isVisible: !item.isVisible } : item)) }} />
                                            &nbsp;&nbsp;{name}&nbsp;&nbsp;
                                        </label>
                                    ))
                                }
                            </td>
                        </tr>
                        {
                            metadataTypes.filter(({ isVisible }) => isVisible).map(({ name, component, path }) => (
                                <tr key={name}>
                                    <td>
                                        {name}
                                    </td>
                                    <td>
                                        {
                                            React.createElement(component, { state: metadataRootState[path], dispatch: metadataStateDispatch })
                                        }
                                    </td>
                                </tr>
                            ))
                        }
                        <tr>
                            <td colSpan={2}>
                                <FileDropZone onBlobAdded={addFileBlobs} onBlobAttached={attachUnallocatedBlobs} showUnallocatedBlobs={true} />
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
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

