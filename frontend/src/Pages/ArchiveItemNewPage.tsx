import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { TagsResponse } from "./ArchiveItemListPage"

type CreateResponse = {
    id: number
}

export const ArchiveItemNewPage = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [fileBlobs, setFileBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const [tagsAutoCompleteList, setTagsAutoCompleteList] = useState<string[]>([])

    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<TagsResponse[]>("/api/tag/list")
            .then(result => {
                const mappedTags = result.map(tag => tag.title)
                setTagsAutoCompleteList(mappedTags)
            })
    }, []);

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        
        const archiveItem = {
            title, tags
        }

        apiClient.post<CreateResponse>("/api/archive/create", archiveItem, {})
            .then(response => {
                //We could also upload files in chunks to handle larger files better.
                const formData = new FormData()
                fileBlobs.forEach(blob => {
                    formData.append("files", blob.fileData, blob.fileName)
                })
                apiClient.postFormData(`/api/blob/upload?archiveItemId=${response.id}`, formData, {})
            })

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
        setFileBlobs([...fileBlobs, ...blobs])
    }

    const removeBlob = (fileName: string) => {
        setFileBlobs(fileBlobs.filter(blob => blob.fileName !== fileName))
    }

    return (
        <div>
            <h1>
                New archive item {title}
            </h1>
            <form onSubmit={save}>
                <div>
                    <label htmlFor="title">Title</label>
                    <input
                        type="text"
                        id="title"
                        placeholder=""
                        autoFocus
                        required
                        value={title}
                        data-1p-ignore
                        onChange={event => setTitle(event.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="tags">Tags</label>
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={tagsAutoCompleteList} />
                </div>
                
                <FileDropZone setFileBlobs={addFileBlobs}></FileDropZone>

                <div style={{display: "flex", flexWrap: "wrap"}}>
                    {fileBlobs?.map((blob, ix) => (
                        <div key={ix} style={{margin: "5px"}}>
                            <LocalFilePreview 
                                key={blob.fileName} 
                                removeBlob={removeBlob} 
                                fileName={blob.fileName}
                                fileData={""}>
                            </LocalFilePreview>
                        </div>
                        
                    ))}
                </div>

                <div>
                    <button type="button" onClick={back}>
                        Back
                    </button>
                    <button type="submit">
                        Save
                    </button>
                </div>
            </form>
        </div >
    )
}
