import { useRef, useState } from "react"

type TagsProps = {
    placeholder?: string
    tags: string[]
    setTags: (tags: string[]) => void
    autocompleteList?: string[]
    htmlId?: string
}
const DELIMITER_PAIRS: [string, string][] = [
	["\"", "\""],
	["'", "'"],
	["(", ")"],
	["[", "]"],
]

const isDelimiterOpen = (value: string) =>
	DELIMITER_PAIRS.some(
		([open, close]) => value.startsWith(open) && !(value.length > 1 && value.includes(close))
	)

const endsWithClosingDelimiter = (value: string) =>
	DELIMITER_PAIRS.some(
		([open, close]) => value.startsWith(open) && value.length > 1 && value.endsWith(close)
	)

const stripDelimiters = (value: string) => {
	const trimmed = value.trim()
	const pair = DELIMITER_PAIRS.find(
		([open, close]) => trimmed.length > 1 && trimmed.startsWith(open) && trimmed.endsWith(close)
	)
	return pair ? trimmed.slice(1, -1) : trimmed
}

export const TagsInput = ({ placeholder, tags, setTags, autocompleteList, htmlId }: TagsProps) => {
	const [tagsInput, setTagsInput] = useState<string>("")
	const inputRef = useRef<HTMLInputElement>(null)

	const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault()	// prevent form submission on Enter key

			if (!isDelimiterOpen(event.currentTarget.value)) {
				const tag = stripDelimiters(event.currentTarget.value).trim()
				if (tag !== "") {
					setTags([...tags, tag])
					setTagsInput("")
				}
			}
			return
		}

		if (event.key === "Backspace" && tagsInput === "") {
			event.preventDefault()
			const lastTag = tags.at(-1) ?? ""
			const valueToEdit = lastTag.includes(" ") ? `(${lastTag})` : lastTag
			setTagsInput(valueToEdit)
			setTags(tags.slice(0, tags.length - 1))
		}
	}

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.value.length > 0
			&& inputRef.current?.selectionStart === event.target.value.length
			&& (event.target.value.endsWith(" ") || endsWithClosingDelimiter(event.target.value))
			&& !isDelimiterOpen(event.target.value)
		) {
			const tag = stripDelimiters(event.currentTarget.value)
			setTags([...tags, tag])

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
					tags?.map((tag, ix) => 
						<span key={ix} className="tag whitespace-nowrap">
							{tag}&nbsp;
							<span onClick={() => removeTag(ix)}>
							&times;
							</span>
						</span>
					)
				}
				<input
					ref={inputRef}
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
