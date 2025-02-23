import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"

type GetResponse = {
    id: number
    title: string
    tags: string[],
    blobIds: number[]
}

type UpdateRequest = {
    id: number
    title: string
    tags: string[]
    blobIds: number[]
}


export const ArchiveItemEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [title, setTitle] = useState<string | null>(null)
    const [tags, setTags] = useState<string[]>([])
    const [blobIds, setBlobIds] = useState<number[]>([])

    const params = useParams()
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<GetResponse>("/api/archive/Get", { id: params.receiptId })
            .then(item => {
                setId(item.id)
                setTitle(item.title)
                setTags(item.tags)
                setBlobIds(item.blobIds)
            })
    }, [])

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        //TODO: Tags is not updated from UI!

        const requestData: UpdateRequest = {
            id: id!, title: title!, tags, blobIds
        }
        apiClient.put("/api/archive/Update", requestData, {})

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    return (
        <div>
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
                <div>
                    here!
                    {
                        blobIds.map((blobId, ix) => <Preview key={ix} blobId={blobId} />)
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
        </div>
    )
}


type PreviewProps = {
    blobId: number
}
const Preview = ({ blobId }: PreviewProps) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const apiClient = useApiClient()

    useEffect(() => {
        if (imgRef.current !== null) {
            apiClient.getBlob("/api/blob/Preview", {blobId, dimensions: 1, page: 1})
                .then(blob => {
                    const url = URL.createObjectURL(blob)
                    imgRef.current!.src = url
                })
        }
    }, [])

    return <>
        <img
            ref={imgRef}
            className="preview"
            alt="Preview image" />
    </>
}