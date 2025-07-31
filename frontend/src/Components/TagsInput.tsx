import { useState } from "react"

type TagsProps = {
    placeholder?: string
    tags: string[]
    setTags: (tags: string[]) => void
    autocompleteList?: string[]
    htmlId?: string
}
export const TagsInput = ({ placeholder, tags, setTags, autocompleteList, htmlId }: TagsProps) => {
    const [tagsInput, setTagsInput] = useState<string>("")

    const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            const tag = event.currentTarget.value
            if (tag !== "") {
                setTags([...tags, tag])
                setTagsInput("")
            }
            return
        }

        if (event.key === "Backspace" && tagsInput === "") {
            event.preventDefault()

            setTagsInput(tags[tags.length - 1] ?? "")
            setTags(tags.slice(0, tags.length - 1))
        }
    }

    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.value.endsWith(" ")) {
            const tag = event.currentTarget.value
            setTags([...tags, tag])
            event.currentTarget

            setTagsInput("")
            return
        }

        setTagsInput(event.target.value)
    }

    const removeTag = (ix: number) => {
        setTags(tags.filter((_, i) => i !== ix))
    }

    return (
        <>
            <span className="input is-wrapper" >
                {
                    tags?.map((tag, ix) => <span key={ix} className="tag whitespace-nowrap">{tag} <span onClick={() => removeTag(ix)}>&times;</span></span>)
                }
                <input
                    className="stripped"
                    type="text"
                    list={htmlId + "List"}
                    placeholder={tags.length == 0 ? placeholder : ""}
                    id={htmlId}
                    value={tagsInput}
                    onKeyDown={keyDown}
                    onChange={onChange}
                />
                <datalist id={htmlId + "List"}>
                    {
                        autocompleteList?.map((s, ix) => <option key={ix} value={s + " "} />)
                    }
                </datalist>
            </span>
        </>
    )
}