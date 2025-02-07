import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"

type ArchiveItemResponse = {
    id: number
    title: string
    created: string
}

type ArchiveItem = {
    id: number
    title: string
    created: Date
}

export const ArchiveListPage = () => {
    const [archiveItems, setArchiveItems] = useState<ArchiveItem[]>()
    const navigate = useNavigate()

    const apiClient = useApiClient()

    useEffect(() => {
        apiClient.get<ArchiveItemResponse[]>("/api/archive/list")
            .then(response => {
                setArchiveItems(response.map(item => ({ ...item, created: new Date(item.created) })))
            })
    }, [])

    const newArchiveItem = () => {
        navigate("/archive/new")
    }

    return (
        <>
            <h1>Archive</h1>
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
                [not implemented]
                {
                    // archiveItem.tags.map((tag, ix) => <span key={ix} className="tag">{tag.name}</span>)
                }
            </td>
            <td>
                {
                    archiveItem.created.toLocaleDateString()
                }
            </td>
        </tr>
    )
}