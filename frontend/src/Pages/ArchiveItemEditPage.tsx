import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { DimensionEnum, Preview } from "../Components/Preview"
import { tagsAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"

type GetResponse = {
    id: number
    title: string
    tags: string[]
    blobs: Blob[]
}

type Blob = {
    id: number
    pageCount: number
}

type UpdateRequest = {
    id: number
    title: string
    tags: string[]
    blobs: Blob[]
}


export const ArchiveItemEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [title, setTitle] = useState<string | null>(null)
    const [tags, setTags] = useState<string[]>([])
    const [blobs, setBlobs] = useState<Blob[]>([])

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

        //TODO: Tags is not updated from UI!

        const requestData: UpdateRequest = {
            id: id!, title: title!, tags, blobs
        }
        apiClient.put("/api/archive/Update", requestData, {})

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    return (
        <>
            <h1>
                Edit item
            </h1>
            <form onSubmit={save}>
                <div>
                    <label htmlFor="name">Name</label>
                    <input
                        type="text"
                        id="name"
                        placeholder=""
                        autoFocus
                        value={title ?? ""}
                        data-1p-ignore
                        onChange={event => setTitle(event.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="tags">Tags</label>
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" />
                </div>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
                    {
                        blobs.map((blob, ix) => <Preview key={ix} blobId={blob.id} numberOfPages={blob.pageCount} maximizedDimension={DimensionEnum.large} minimizedDimension={DimensionEnum.small}/>)
                    }
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
