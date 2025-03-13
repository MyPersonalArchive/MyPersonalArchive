import { useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../Utils/Atoms"
import { createQueryString } from "../Utils/createQueryString"

type ListResponse = {
    id: number
    title: string
    tags: string[]
    createdAt: string
}

type ArchiveItem = {
    id: number
    title: string
    tags: string[]
    createdAt: Date
}

export const ArchiveItemListPage = () => {
    const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>()
    const [searchParams] = useSearchParams()

    const navigate = useNavigate()
    const apiClient = useApiClient()

    useEffect(() => {
        const payload = {
            title: searchParams.get("title"),
            tags: searchParams.getAll("tags")
        }
        apiClient.get<ListResponse[]>("/api/archive/list", payload)
            .then(response => setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt) }))))
    }, [searchParams])


    useSignalR((message: SignalRMessage) => {
        switch (message.messageType) {
            case "ArchiveItemCreated":
            case "ArchiveItemUpdated":
            case "ArchiveItemDeleted": {
                apiClient.get<ListResponse[]>("/api/archive/list")
                    .then(response => {
                        setArchiveItems(response.map(item => ({ ...item, createdAt: new Date(item.createdAt) })))
                    })
                break
            }
        }
    })

    const newArchiveItem = () => {
        navigate("/archive/new")
    }

    return (
        <>
            <h1>Archive</h1>
            <button onClick={() => newArchiveItem()}>Add item</button>
            <Filter />
            <table style={{ width: "100%" }}>
                <thead>
                    <tr>
                        <td>Title</td>
                        <td>Tags</td>
                        <td>Created</td>
                    </tr>
                </thead>
                <tbody>
                    {
                        archiveItems?.map(item => <Row key={item.id} archiveItem={item} />)
                    }
                </tbody>
            </table>
            <button onClick={() => newArchiveItem()}>Add item</button>
        </>
    )
}


type RowProps = {
    archiveItem: ArchiveItem
}
const Row = ({ archiveItem }: RowProps) => {
    return (
        <tr>
            <td>
                <Link to={`/archive/edit/${archiveItem.id}`}>{archiveItem.title}</Link>
            </td>
            <td>
                {
                    archiveItem.tags.map((tag, ix) => <span key={ix} className="tag">{tag}</span>)
                }
            </td>
            <td>
                {
                    archiveItem.createdAt.toLocaleDateString()
                }
            </td>
        </tr>
    )
}


const Filter = () => {
    const [title, setTitle] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const allTags = useAtomValue(tagsAtom)
    const [searchParams] = useSearchParams()

    const navigate = useNavigate()

    useEffect(() => {
        setTitle(searchParams.get("title") ?? "")
        setTags(searchParams.getAll("tags"))        
    }, [])

    const search = () => {
        navigate({
            search: createQueryString({ title, tags: tags.map(tag => tag.trim()) }, { skipEmptyStrings: true })
        })
    }

    const reset = () => {
        setTitle("")
        setTags([])
    }

    return (
        <div>
            <input type="text"
                placeholder="Search by title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                onKeyDown={event => event.key === "Enter" ? search() : null} />

            <TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} />

            <button onClick={search}>Search</button>
            <button onClick={reset}>Reset</button>
        </div>
    )
}