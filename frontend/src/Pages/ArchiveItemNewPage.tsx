import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"

export const ArchiveItemNewPage = () => {
    const [title, setTitle] = useState<string>()
    const [tags, setTags] = useState<string[]>([])
    const [fileBlobs, setFileBlobs] = useState<({ fileName: string, fileData: string }[])>([])
    const navigate = useNavigate()
    const apiClient = useApiClient()

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        
        const archiveItem = {
            title, tags, blobs: fileBlobs
        }

        apiClient.post("/api/archive/create", archiveItem, {})

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    const addFileBlobs = (blobs: { fileName: string, fileData: string }[]) => {
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
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={["stein", "saks", "papir"]} />
                </div>
                
                <FileDropZone setFileBlobs={addFileBlobs}></FileDropZone>

                <div style={{display: "flex", flexWrap: "wrap"}}>
                    {fileBlobs?.map(blob => (
                        <div style={{margin: "5px"}}>
                            <LocalFilePreview 
                                key={blob.fileName} 
                                removeBlob={removeBlob} 
                                fileName={blob.fileName}
                                fileData={blob.fileData}>
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
