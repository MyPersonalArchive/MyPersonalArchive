import { useEffect, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { TagsInput } from "./TagsInput"
import { ListResponse, TagsResponse } from "../Pages/ArchiveItemListPage"

type SearchProps = {
    searchResult: (result: ListResponse[]) => void
    resetResult: () => void
}


export const Search = ({searchResult, resetResult}: SearchProps) => {
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
            title: searchTerm
        }

        if(tags.length > 0) {
            payload = {
                ...payload,
                tags: tags.map(tag => tag.replace(" ", ""))
            }
        }

        console.log(payload)

        apiClient.get<ListResponse[]>("/api/archive/search", payload).then(response => {
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