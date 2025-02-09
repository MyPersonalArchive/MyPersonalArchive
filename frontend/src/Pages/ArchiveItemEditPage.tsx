import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { IResponseReceipt } from "../Stuff/ReceiptModels"
import { IReceiptTag } from "../Stuff/CategoryModels"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { useSignalR } from "../Frames/SignalRProvider"

export const ArchiveItemEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [name, setName] = useState<string | null>(null)
    const [tags, setTags] = useState<string[]>([])

    const params = useParams()
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useSignalR("archiveItemUpdated", (message) => {
        console.log("SignalR - archiveItemUpdated", message)
    })

    useEffect(() => {
        apiClient.get<IResponseReceipt>("/api/archive/Get", { id: params.receiptId })
            .then(receipt => {
                setId(receipt.receiptId)
                setName(receipt.name)
                setTags(receipt.tags.map((tag: IReceiptTag) => tag.name))
            })
    }, [])

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const archiveItem = {
            id, name, tags
        }
        apiClient.post("/api/archive/Create", archiveItem, {})

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
                        required
                        value={name ?? ""}
                        data-1p-ignore
                        onChange={event => setName(event.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="tags">Tags</label>
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" />
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