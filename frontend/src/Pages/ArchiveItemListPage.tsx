import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"
import { SignalRMessage, useSignalR } from "../Utils/useSignalR"
import { TagsInput } from "../Components/TagsInput"

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

    useSignalR((message: SignalRMessage) => {
        // console.log("*** MESSAGE RECEIVED", message)

        switch (message.messageType) {
            case "ArchiveItemCreated":
            case "ArchiveItemUpdated":
            case "ArchiveItemDeleted": {
                apiClient.get<ListResponse[]>("/api/archive/List")
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



type SearchProps = {
    searchResult: (result: ListResponse[]) => void
    resetResult: () => void
}
const Search = ({ searchResult, resetResult }: SearchProps) => {
    const apiClient = useApiClient()

    const [searchTerm, setSearchTerm] = useState<string>("")
    const [tags, setTags] = useState<string[]>([])
    const [tagsAutoCompleteList, setTagsAutoCompleteList] = useState<string[]>([])

    useEffect(() => {
        apiClient.get<TagsResponse[]>("/api/tag/list")
            .then(result => {
                const mappedTags = result.map(tag => tag.title)
                setTagsAutoCompleteList(mappedTags)
            })
    }, []);

    const search = () => {
        let payload: { title: string | undefined, tags?: string[] } = {
            title: searchTerm,
            tags: tags.map(tag => tag.replace(" ", ""))
        }

        apiClient.get<ListResponse[]>("/api/archive/filter", payload).then(response => {
            searchResult(response)
        })
    }

    const reset = () => {
        setSearchTerm("")
        setTags([])
        resetResult()
    }

    return (
        <>
            <input type="text"
                placeholder="Search by title"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                onKeyDown={event => event.key === "Enter" ? search() : null} />

            <TagsInput tags={tags} setTags={setTags} autocompleteList={tagsAutoCompleteList} htmlId={""}></TagsInput>

            <button onClick={search}>Search</button>
            <button onClick={reset}>Reset</button>
        </>
    )
}