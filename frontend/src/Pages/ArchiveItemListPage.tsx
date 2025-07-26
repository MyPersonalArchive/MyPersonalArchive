import { FormEvent, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../Utils/Atoms"
import { createQueryString } from "../Utils/createQueryString"
import { FileDropZone } from "../Components/FileDropZone"
import { RoutePaths } from "../RoutePaths"

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
        <div className="container mx-auto px-4 py-6">
            <h1 className="heading-1">
                Archive
            </h1>
            <div>
                <FileDropZone onBlobAttached={() => { }} />
            </div>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <button className="btn" onClick={newArchiveItem}>Create new item</button>
                <button className="btn" onClick={() => navigate(RoutePaths.Blobs)}>Create new item from unallocated blobs</button>
            </div>
            <Filter />
            <div className="overflow-x-auto mt-6">
                <table className="has-thead has-tbody no-column-seperators">
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Tags</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            archiveItems?.map(item => <Row key={item.id} archiveItem={item} />)
                        }
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end mt-6 gap-2">
                <button className="btn btn-primary" onClick={newArchiveItem}>Create new item</button>
            </div>
        </div>
    )
}


type RowProps = {
    archiveItem: ArchiveItem
}
const Row = ({ archiveItem }: RowProps) => {
    return (
        <tr>
            <td>
                <Link to={`/archive/edit/${archiveItem.id}`} className="text-blue-600 hover:underline">{archiveItem.title}</Link>
            </td>
            <td>
                {
                    archiveItem.tags.map((tag, ix) => (
                        <span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded px-2 py-1 mr-1 text-xs">{tag}</span>
                    ))
                }
            </td>
            <td>
                {archiveItem.createdAt.toLocaleDateString()}
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

    const reset = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setTitle("")
        setTags([])
        navigate({
            search: createQueryString({ title: "", tags: [] }, { skipEmptyStrings: false })
        })
    }

    return (
        <form onSubmit={search} onReset={reset}>
            <input className="input"
                type="text"
                placeholder="Search by title"
                value={title}
                onChange={event => setTitle(event.target.value)}
            />
            <TagsInput placeholder="Search by tags" tags={tags} setTags={setTags} autocompleteList={allTags} />
            <button type="submit" className="btn btn-primary" >
                Search
            </button>
            <button type="reset" className="btn">
                Reset
            </button>
        </form>
    )
}