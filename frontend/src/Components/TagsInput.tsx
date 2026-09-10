import { useRef, useState } from "react"

type TagsProps = {
	placeholder?: string
	tags: string[]
	setTags: (tags: string[]) => void
	autocompleteList?: string[]
	className?: string
}

export const TagsInput = ({ placeholder, tags, setTags, autocompleteList, className }: TagsProps) => {
	const [tagsInput, setTagsInput] = useState<string>("")
	const inputRef = useRef<HTMLInputElement>(null)

	const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter" || event.key === "Tab") {
			if (event.key === "Tab" && event.currentTarget.value.trim() === "") {
				// Allow navigation with Tab if it is pressed and the input is empty
				return
			}
			event.preventDefault()	// Prevent form submission on Enter key, and prevent navigation to next inputon Tab key

			const tag = event.currentTarget.value.trim()
			if (tag !== "") {
				setTags([...tags, tag])
				setTagsInput("")
			}
			return
		}

		if (event.key === "Backspace" && tagsInput === "") {
			event.preventDefault()
			const lastTag = tags.at(-1) ?? ""
			const valueToEdit = lastTag
			setTagsInput(valueToEdit)
			setTags(tags.slice(0, tags.length - 1))
		}
	}

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setTagsInput(event.target.value)
	}

	const removeTag = (ix: number) => {
		setTags(tags.filter((_, i) => i !== ix))
	}

	return (
		<>
			<label className={`textarea ${className}`}>
				<span className="label">Tags</span>
				<div className="h-auto min-h-4 px-3 py-2 flex flex-wrap gap-2 items-baseline" >
					{
						tags?.map((tag, ix) =>
							<span key={ix} className="pill tag whitespace-nowrap">
								{tag}&nbsp;
								<span onClick={() => removeTag(ix)}>
									&times;
								</span>
							</span>
						)
					}
					<input
						ref={inputRef}
						className="outline-none flex-1 min-w-10"
						type="text"
						list="tagsList"
						placeholder={tags.length == 0 ? placeholder : ""}
						value={tagsInput}
						onKeyDown={keyDown}
						onChange={onChange}
					/>
					<datalist id="tagsList">
						{
							autocompleteList?.map((s) => <option key={s} value={s} />)
						}
					</datalist>
				</div>
			</label>
		</>
	)
}
