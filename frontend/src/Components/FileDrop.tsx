import { DragEventHandler, PropsWithChildren, useRef } from "react"


export type Props =  {
	className?: string
	onClickOverride?: () => void
	onFilesUploaded: (files: FileList) => void
}
export const FileDrop = ({ className, children, onClickOverride = undefined, onFilesUploaded }: PropsWithChildren<Props>) => {
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const onDragOver: DragEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault()
		// consider what is dragged over the drop zone and set some state to give visual feedback
	}

	const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
		event.preventDefault()
		// when files are dropped, set the file input's files to the dropped files and trigger the change event
		const { files } = event.dataTransfer
		if (files.length > 0) {
			fileInputRef.current!.files = files
			fileInputRef.current!.dispatchEvent(new Event("change", { bubbles: true }))
		}
	}

	// The onChange handler is triggered when files are selected via the file input or dropped into the drop zone
	const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
		event.stopPropagation()
		event.preventDefault()

		const files = event.target.files
		if (files !== null && files.length > 0) {
			console.log("Files dropped: ", files)

			onFilesUploaded(files)
		}
	}

	const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
		e.stopPropagation()
		if (onClickOverride) {
			onClickOverride()
		} else {
			fileInputRef?.current?.click()
		}
	}


	return (
		<div className={className}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onClick={onClick}
		>
			<input className="hidden"
				type='file' multiple
				id='file'
				ref={fileInputRef}
				onChange={onChange}
			/>
			{children}
		</div>
	)
}