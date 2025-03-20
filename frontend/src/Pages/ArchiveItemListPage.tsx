import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../Utils/Atoms"
import { createQueryString } from "../Utils/createQueryString"
import { FileDropZone } from "../Components/FileDropZone"

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
        switch (message.data) {
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
            <div className="form">
                <button onClick={() => newArchiveItem()}>Add item</button>
                <button onClick={() => navigate("/archive/unallocated")}>Unallocated</button>
            </div>
            <Filter />
            <FileDropZone onBlobAttached={() => {}}/>
            <table style={{ width: "100%" }}>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Tags</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody className="visible-cell-dividers">
                    {
                        archiveItems?.map(item => <Row key={item.id} archiveItem={item} />)
                    }
                </tbody>
            </table>
            <div className="form">
                <button onClick={() => newArchiveItem()}>Add item</button>
            </div>
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

    const search = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigate({
            search: createQueryString({ title, tags: tags.map(tag => tag.trim()) }, { skipEmptyStrings: true })
        })
    }

    const reset = () => {
        setTitle("")
        setTags([])
    }

    return (
        <form onSubmit={search} onReset={reset}>
            <input type="text"
                placeholder="Search by title"
                value={title}
                onChange={event => setTitle(event.target.value)}
            />

            <TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} />

            <button type="submit">Search</button>
            <button type="reset">Reset</button>
        </form>
    )
}