import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"

export const ArchiveItemNewPage = () => {
    const [name, setName] = useState<string>()
    const [amount, setAmount] = useState<number>()
    const [tags, setTags] = useState<string[]>([])
    const navigate = useNavigate()
    const apiClient = useApiClient()

    const save = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const receipt = {
            name, amount, tags
        }

        apiClient.post("/api/receipt/postReceipt", receipt, {})

        navigate(-1)
    }

    const back = () => {
        navigate(-1)
    }



    return (
        <div>
            <h1>
                New receipt {name}
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
                        value={name}
                        data-1p-ignore
                        onChange={event => setName(event.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="amount">Amount</label>
                    <input
                        type="number"
                        placeholder=""
                        id="amount"
                        required
                        value={amount}
                        onChange={event => setAmount(Number.parseFloat(event.target.value))}
                    />
                </div>
                <div>
                    <label htmlFor="tags">Tags</label>
                    <TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={["stein", "saks", "papir"]} />
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
