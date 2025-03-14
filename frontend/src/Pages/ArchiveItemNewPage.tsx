import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { useApiClient } from "../Utils/useApiClient"
import { tagsAtom } from "../Utils/Atoms"

type CreateResponse = {
    id: number
}

export const ArchiveItemNewPage = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [fileBlobs, setFileBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
    const allTags = useAtomValue(tagsAtom)

    const navigate = useNavigate()
    const apiClient = useApiClient()

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const formData = new FormData()
        const createRequest = {
            title, 
            tags
        }

        formData.append("rawRequest", JSON.stringify(createRequest))

        fileBlobs.forEach(blob => {
            formData.append("files", blob.fileData, blob.fileName)
        })

        apiClient.postFormData<CreateResponse>("/api/archive/create", formData)
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
        <>
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
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={allTags} />
                </div>
                
                <FileDropZone setFileBlobs={addFileBlobs}></FileDropZone>

                <div style={{display: "flex", flexWrap: "wrap"}}>
                    {fileBlobs?.map((blob, ix) => (
                        <div key={ix} style={{margin: "5px"}}>
                            <LocalFilePreview 
                                key={blob.fileName} 
                                removeBlob={removeBlob} 
                                fileName={blob.fileName}
                                blob={blob.fileData}>
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
        </>
    )
}
