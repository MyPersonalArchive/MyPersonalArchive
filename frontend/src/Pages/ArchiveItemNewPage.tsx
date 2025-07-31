import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { useApiClient } from "../Utils/useApiClient"
import { tagsAtom } from "../Utils/Atoms"
import { RoutePaths } from "../RoutePaths"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { BlobIdAndNumberOfPages, DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"

type CreateResponse = {
    id: number
}

export const ArchiveItemNewPage = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [localBlobs, setLocalBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const [blobsFromUnallocated, setBlobsFromUnallocated] = useState<BlobIdAndNumberOfPages[]>([])

    const allTags = useAtomValue(tagsAtom)

    const { selectedMetadataTypes, metadata, dispatch } = useMetadata(allMetadataTypes)

    const navigate = useNavigate()
    const apiClient = useApiClient()

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const formData = new FormData()
        const createRequest = {
            title,
            tags,
            blobsFromUnallocated,
            metadata
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

    const attachUnallocatedBlobs = (blobs: BlobIdAndNumberOfPages[]) => {
        setBlobsFromUnallocated(blobsFromUnallocated => [...blobsFromUnallocated, ...blobs])
    }

    const removeUnallocatedBlob = (blob: BlobIdAndNumberOfPages) => {
        setBlobsFromUnallocated(blobsFromUnallocated => blobsFromUnallocated.filter(x => x.id !== blob.id))
    }

    return (
        <>
            <h1 className="heading-2">
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
                            <td colSpan={2}>
                                <MetadataTypeSelector
                                    selectedMetadataTypes={selectedMetadataTypes}
                                    allMetadataTypes={allMetadataTypes}
                                    dispatch={dispatch(MetadataControlPath)}
                                />
                            </td>
                        </tr>
                        {
                            allMetadataTypes
                                .filter(({ path }) => selectedMetadataTypes.has(path as string))
                                .map((metadataType) => (
                                    <tr key={metadataType.displayName}>
                                        <td>
                                            {metadataType.displayName}
                                        </td>
                                        <td>
                                            <MetadataElement
                                                metadataType={metadataType}
                                                metadata={metadata}
                                                dispatch={dispatch(metadataType.path)}
                                            />
                                        </td>
                                    </tr>
                                ))
                        }
                        <tr>
                            <td colSpan={2}>
                                <FileDropZone showUnallocatedBlobs={true}
                                    onBlobAdded={addFileBlobs}
                                    onBlobAttached={attachUnallocatedBlobs}
                                />

                                <PreviewList blobs={blobsFromUnallocated} containerClassName="flex flex-wrap"
                                    thumbnailPreviewTemplate={(blob, maximize) =>
                                        <Preview key={blob.id} blob={blob} dimension={DimensionEnum.small} showPageNavigation={false}
                                            onRemove={removeUnallocatedBlob}
                                            onMaximize={() => maximize(blob)} />
                                    }
                                    maximizedPreviewTemplate={(blob, minimize) =>
                                        <Preview key={blob.id} blob={blob} dimension={DimensionEnum.large} showPageNavigation={false}
                                            onRemove={removeUnallocatedBlob}
                                            onMaximize={() => minimize()} />
                                    }
                                />
                                
                                <div className="flex flex-wrap">
                                    {
                                        //TODO: Use PreviewList component here!
                                        localBlobs?.map((blob) => (
                                            <div key={blob.fileName} style={{ marginLeft: "5px" }}>
                                                <LocalFilePreview removeBlob={removeBlob} fileName={blob.fileName} blob={blob.fileData} />
                                            </div>
                                        ))
                                    }
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2}>
                                <button className="btn" type="button" onClick={back}>
                                    Back
                                </button>
                                <button className="btn btn-primary" type="submit">
                                    Save
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form >
        </>
    )
}
