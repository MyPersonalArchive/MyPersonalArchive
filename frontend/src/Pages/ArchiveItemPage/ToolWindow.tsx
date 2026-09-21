import { FloatingToolWindow } from "../../Components/FloatingToolWindow"
import { TagsInput } from "../../Components/TagsInput"
import { useEffect, useRef, useState } from "react"
import { useAtomValue } from "jotai"
import { tagsAtom } from "../../Utils/Atoms/tagsAtom"
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"


type Props = {
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
	toolWindowPosition: Position
	toolWindowSize: Size
	setToolWindowPosition: (position: Position) => void
	setToolWindowSize: (size: Size) => void
}
export const ToolWindow = ({ setToolWindowIsOpen, toolWindowPosition, toolWindowSize, setToolWindowPosition, setToolWindowSize }: Props) => {
	const [title, setTitle] = useState("")
	const [tags, setTags] = useState<string[]>([])
	const [documentDate, setDocumentDate] = useState("")
	const allTags = useAtomValue(tagsAtom)


	const firstInputRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		firstInputRef.current?.focus()
	}, [])

	return (
		<FloatingToolWindow title="Quick edit archive item"
			className="flex flex-col gap-2 p-2"
			initialPosition={toolWindowPosition}
			initialSize={toolWindowSize}
			onPositionChange={setToolWindowPosition}
			onSizeChange={setToolWindowSize}
			minWidth={268} minHeight={171}
			onClose={() => { setToolWindowIsOpen?.(false) }}
			closeOnEscape={true}
		>
			<div className="todo">
				//TODO:<br />
				Show page or tab to edit each metadata type<br />
			</div>



			<div>
				<label htmlFor="title">Title</label>
				<input type="text"
					ref={firstInputRef}
					className="input"
					id="title" placeholder="" autoFocus data-1p-ignore
					value={title}
					onChange={event => setTitle(event.target.value)}
				/>
			</div>

			<span className="join">
				<label className="floating-label">
					<input type="date" className="input"
						value={documentDate ?? ""}
						onChange={e => setDocumentDate(e.target.value)}
					/>
					<span className="label">Document date</span>
				</label>
				<button className="btn" type="button" onClick={() => setDocumentDate("")}>&times;</button>
			</span>

			<TagsInput tags={tags} setTags={setTags} autocompleteList={Array.from(allTags)} />

		</FloatingToolWindow>
	)
}
