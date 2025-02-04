import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { IResponseReceipt } from "../Stuff/ReceiptModels"
import { IReceiptTag } from "../Stuff/CategoryModels"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { useSignalR } from "../Frames/SignalRProvider"

export const ReceiptEditPage = () => {
    const [id, setId] = useState<number | null>(null)
    const [name, setName] = useState<string | null>(null)
    const [amount, setAmount] = useState<number | null>(null)
    const [tags, setTags] = useState<string[]>([])
    const params = useParams()
    const navigate = useNavigate()
    const apiClient = useApiClient()

    useSignalR("receiptUpdated", (message) => {
        console.log("SignalR - receiptUpdated", message)
    })

    useEffect(() => {
        apiClient.get<IResponseReceipt>("/api/Receipt/GetReceipt", { id: params.receiptId })
            .then(receipt => {
                setId(receipt.receiptId)
                setName(receipt.name)
                setAmount(receipt.amount)
                setTags(receipt.tags.map((tag: IReceiptTag) => tag.name))
            })
    }, [])

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const receipt = {
            id, name, amount, tags
        }
        apiClient.post("/api/receipt/updateReceipt", receipt)

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }

    return (
        <div>
            <h1>
                Edit receipt
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
                    <label htmlFor="amount">Amount</label>
                    <input
                        type="string"
                        placeholder=""
                        id="amount"
                        required
                        value={amount ?? ""}
                        onChange={event => setAmount(Number.parseFloat(event.target.value))}
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