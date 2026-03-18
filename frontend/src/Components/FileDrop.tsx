import { DragEventHandler, PropsWithChildren, useRef } from "react"
import { useApiClient } from "../Utils/Hooks/useApiClient"


export type FileDropProps = PropsWithChildren & {
	className?: string
}
export const FileDrop = ({ className, children }: FileDropProps) => {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const apiClient = useApiClient()

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

	const onChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
		event.stopPropagation()
		event.preventDefault()

		const files = event.target.files ?? []
		if (files.length > 0) {
			console.log("Files dropped: ", files)
			
			const formData = new FormData()
			Array.from(files).forEach(file => {
				formData.append("files", file, file.name)
			})

			apiClient.postFormData("/api/blob/upload", formData)
		}
	}

	return (
		<div className={className}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onClick={() => fileInputRef?.current?.click()}
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