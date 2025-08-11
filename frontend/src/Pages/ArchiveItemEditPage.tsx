import React, { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { BlobIdAndNumberOfPages, DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { tagsAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { RoutePaths } from "../RoutePaths"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"

type GetResponse = {
    id: number
    title: string
    tags: string[]
    blobs: BlobResponse[]
    metadata: Record<string, any>
}

type BlobResponse = {
    id: number
    numberOfPages: number
}


export const ArchiveItemEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [blobs, setBlobs] = useState<BlobIdAndNumberOfPages[]>([])
    const [localBlobs, setLocalBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const [removedBlobs, setRemovedBlobs] = useState<number[]>([])

    const allTags = useAtomValue(tagsAtom)

    const { selectedMetadataTypes, metadata, dispatch } = useMetadata(allMetadataTypes)

    const params = useParams()
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<GetResponse>("/api/archive/get", { id: params.id })
            .then(item => {
                setId(item.id)
                setTitle(item.title)
                setTags(item.tags)
                setBlobs(item.blobs.map(blob => ({ id: blob.id, numberOfPages: blob.numberOfPages })))

                dispatch(MetadataControlPath)({ action: "METADATA_LOADED", metadata: item.metadata, dispatch: dispatch })
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
            removedBlobs,
            metadata
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

    const attachUnallocatedBlobs = (blobs: BlobIdAndNumberOfPages[]) => {
        blobs.forEach(blob => {
            setBlobs(blobs => [...blobs, blob])
            setRemovedBlobs(removedBlobs => removedBlobs.filter(id => id !== blob.id))
        })
    }

    const removeUnallocatedBlob = (blob: BlobIdAndNumberOfPages) => {
        setBlobs(existingBlobs => existingBlobs.filter(x => x.id !== blob.id))
        setRemovedBlobs(removedBlobs => [...removedBlobs, blob.id])
    }

    return (
        <>
            <form onSubmit={save}>

                <h1 className="heading-2">
                    Edit item
                </h1>


                <div className="aligned-labels-and-inputs">
                    <label htmlFor="title">Title</label>
                    <input className="input" type="text"
                        id="title" placeholder="" autoFocus data-1p-ignore
                        value={title}
                        onChange={event => setTitle(event.target.value)}
                    />
                </div>

                <div className="aligned-labels-and-inputs">
                    <label htmlFor="tags">Tags</label>
                    <TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} htmlId="tags" />
                </div>

                <MetadataTypeSelector
                    selectedMetadataTypes={selectedMetadataTypes}
                    allMetadataTypes={allMetadataTypes}
                    dispatch={dispatch(MetadataControlPath)}
                />

                {
                    allMetadataTypes
                        .filter(({ path }) => selectedMetadataTypes.has(path as string))
                        .map((metadataType) => (
                            <div key={metadataType.path as string} className="aligned-labels-and-inputs">
                                <span>{metadataType.displayName}</span>
                                <div className="w-full">
                                    <MetadataElement
                                        metadataType={metadataType}
                                        metadata={metadata}
                                        dispatch={dispatch(metadataType.path)}
                                    />
                                </div>
                            </div>
                        ))
                }

                <FileDropZone onBlobAdded={addFileBlobs} onBlobAttached={attachUnallocatedBlobs} showUnallocatedBlobs={true} />

                <div>
                    <PreviewList<BlobIdAndNumberOfPages> blobs={blobs}
                        containerStyle={{ display: "flex", flexDirection: "row", justifyContent: "center" }}
                        containerClassName="flex flex-row justify-center"
                        thumbnailPreviewTemplate={
                            (blob, maximize) =>
                                <Preview key={blob.id} blob={blob} dimension={DimensionEnum.small} showPageNavigation={false}
                                    onRemove={removeUnallocatedBlob}
                                    onMaximize={() => maximize(blob)}
                                />
                        }
                        maximizedPreviewTemplate={
                            (blob, minimize) =>
                                <Preview key={blob.id} blob={blob} dimension={DimensionEnum.large}
                                    onRemove={removeUnallocatedBlob}
                                    onMinimize={() => minimize()}
                                />
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

                <div className="push-right">
                    <Link className="link align-with-btn" to={-1 as any}>
                        Back
                    </Link>
                    <button className="btn btn-primary" type="submit">
                        Save
                    </button>
                </div>
            </form>
        </>
    )
}
