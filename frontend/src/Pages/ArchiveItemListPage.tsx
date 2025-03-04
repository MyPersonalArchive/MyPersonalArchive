import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { Search } from "../Components/Search"

export type ListResponse = {
    id: number
    title: string
    tags: string[]
    createdAt: string
}

export type TagsResponse = {
    title: string
}

type ArchiveItem = {
    id: number
    title: string
    tags: string[]
    createdAt: Date
}

export const ArchiveItemListPage = () => {
    const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>()
    const navigate = useNavigate()

    const apiClient = useApiClient()

    // useSignalR("archiveItemUpdated", (message) => {
    //     console.log("SignalR - archiveItemUpdated", message)
    // })

    useEffect(() => {
        getList()
    }, [])

    const getList = () => {
        apiClient.get<ListResponse[]>("/api/archive/List")
            .then(response => {
                setArchiveItems(mapArchiveItems(response))
            })
    }

    const mapArchiveItems = (items: ListResponse[]) => {
        return items.map(item => ({ ...item, createdAt: new Date(item.createdAt) }))
    }

    const newArchiveItem = () => {
        navigate("/archive/new")
    }

    return (
        <>
            <h1>Archive</h1>
            <Search searchResult={result => setArchiveItems(mapArchiveItems(result))} resetResult={() => getList()}></Search>
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
            <button onClick={event => newArchiveItem()}>Add item</button>
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