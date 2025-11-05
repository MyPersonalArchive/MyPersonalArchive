import React, { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/useApiClient"
import { BlobIdAndNumberOfPages, DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { tagsAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { RoutePaths } from "../RoutePaths"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { DatePicker } from "../Components/DatePicker"
import { DialogFooter, DialogHeader, ModalDialog } from "../Components/ModelDialog"
import { ServerViewer } from "../Components/Viewers/ServerViewer"
import { LocalViewer } from "../Components/Viewers/LocalViewer"
import { StackedView } from "../Components/Viewers/StackedView"

type GetResponse = {
	id: number
	title: string
	label: string
	tags: string[]
	blobs: BlobResponse[]
	metadata: Record<string, any>
	documentDate: string
}

type BlobResponse = {
	id: number
	numberOfPages: number
	mimeType?: string
}

type LocalBlob = {
	fileName: string
	fileData: Blob
	mimeType?: string
}


export const ArchiveItemEditPage = () => {
	const [id, setId] = useState<number | null>(null)
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const [label, setLabel] = useState<string>()
	const [documentDate, setDocumentDate] = useState("")
	const [blobs, setBlobs] = useState<BlobIdAndNumberOfPages[]>([])
	const [localBlobs, setLocalBlobs] = useState<LocalBlob[]>([])
	const [removedBlobs, setRemovedBlobs] = useState<number[]>([])
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

	const allTags = useAtomValue(tagsAtom)

	const { selectedMetadataTypes, metadata, dispatch } = useMetadata(allMetadataTypes)

	const params = useParams()
	const navigate = useNavigate()
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<GetResponse>("/api/archive/get", { id: params.id })
			.then(item => {
				setId(item.id)
				setTitle(item.title)
				setTags(item.tags)
				setBlobs(item.blobs.map(blob => ({ id: blob.id, numberOfPages: blob.numberOfPages, mimeType: blob.mimeType })))
				setLabel(item.label)
				setDocumentDate(item.documentDate)

				dispatch(MetadataControlPath)({ action: "METADATA_LOADED", metadata: item.metadata, dispatch: dispatch })
			})
	}, [])

	const save = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const formData = new FormData()
		const updateRequest = {
			id: id!,
			title: title!,
			tags,
			blobsFromUnallocated: blobs.map(blob => blob.id),
			removedBlobs,
			metadata,
			label,
			documentDate
		}

		formData.append("rawRequest", JSON.stringify(updateRequest))

		localBlobs.forEach(blob => {
			formData.append("files", blob.fileData, blob.fileName)
		})

		apiClient.putFormData("/api/archive/Update", formData)

		navigate(RoutePaths.Archive)
	}

	const deleteItem = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault()

		apiClient.delete("/api/archive/delete", { id: id! })
		navigate(RoutePaths.Archive)
	}

	const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
		setLocalBlobs([...localBlobs, ...blobs])
	}

	const removeBlob = (fileName: string) => {
		setLocalBlobs(localBlobs.filter(blob => blob.fileName !== fileName))
	}

	const attachUnallocatedBlobs = (blobs: BlobIdAndNumberOfPages[]) => {
		blobs.forEach(blob => {
			setBlobs(blobs => [...blobs, blob])
			setRemovedBlobs(removedBlobs => removedBlobs.filter(id => id !== blob.id))
		})
	}

	const removeUnallocatedBlob = (blob: BlobIdAndNumberOfPages) => {
		setBlobs(existingBlobs => existingBlobs.filter(x => x.id !== blob.id))
		setRemovedBlobs(removedBlobs => [...removedBlobs, blob.id])
	}

	return (
		<>
			<form onSubmit={save}>

				<h1 className="heading-2">
					Edit item
				</h1>


				<div className="aligned-labels-and-inputs">
					<label htmlFor="title">Title</label>
					<input type="text"
						className="input"
						id="title" placeholder="" autoFocus data-1p-ignore
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="documentDate">Document date</label>

					<DatePicker date={documentDate} setDate={setDocumentDate} />

				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="tags">Tags</label>
					<TagsInput tags={tags} setTags={setTags} autocompleteList={allTags} htmlId="tags" />
				</div>


				<MetadataTypeSelector
					selectedMetadataTypes={selectedMetadataTypes}
					allMetadataTypes={allMetadataTypes}
					dispatch={dispatch(MetadataControlPath)}
				/>

				{
					allMetadataTypes
						.filter(({ path }) => selectedMetadataTypes.has(path as string))
						.map((metadataType) => (
							<div key={metadataType.path as string} className="aligned-labels-and-inputs">
								<span>{metadataType.displayName}</span>
								<div className="w-full">
									<MetadataElement
										metadataType={metadataType}
										metadata={metadata}
										dispatch={dispatch(metadataType.path)}
									/>
								</div>
							</div>
						))
				}

				<FileDropZone onBlobAdded={addFileBlobs} onBlobAttached={attachUnallocatedBlobs} showUnallocatedBlobs={true} />

				<div>
					<PreviewList<BlobIdAndNumberOfPages> items={blobs}
						containerClassName="grid grid-cols-4 gap-4 pt-2"
						thumbnailPreviewTemplate={
							(blob, maximize) =>
								<Preview key={blob.id} blob={blob} dimension={DimensionEnum.small}
									onRemove={removeUnallocatedBlob}
									onMaximize={() => maximize(blob)}
								/>
						}
						maximizedPreviewTemplate={
							(blob, minimize) =>

								<Preview key={blob.id} blob={blob} dimension={DimensionEnum.full}
									onRemove={removeUnallocatedBlob}
									onMinimize={() => minimize()}
								/>
						}
					/>

					<PreviewList<LocalBlob> blobs={localBlobs}
						containerClassName="grid grid-cols-4 gap-4 pt-2"
						thumbnailPreviewTemplate={
							(blob, maximize) =>
								<LocalViewer 
									key={blob.fileName} 
									blob={blob.fileData}
									fileName={blob.fileName}
									dimension={DimensionEnum.small}
									removeBlob={removeBlob}
									onMaximize={() => maximize(blob)}
								/>
						}
						maximizedPreviewTemplate={
							(blob, minimize) =>
								<LocalViewer 
									key={blob.fileName} 
									blob={blob.fileData}
									fileName={blob.fileName}
									dimension={DimensionEnum.full}
									onMinimize={minimize}
									removeBlob={removeBlob}
								/>
						}
					/>
				</div>

				<div className="push-right">
					<Link className="link align-with-btn" to={-1 as any}>
						Back
					</Link>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
					<button className="btn btn-danger" onClick={(e) => { e.preventDefault(); setOpenDeleteDialog(true) }}>
						Delete
					</button>
				</div>

				{
					openDeleteDialog && (
						<ModalDialog onClose={() => { setOpenDeleteDialog(false) }}>
							<DialogHeader>
								<div>
									Are you sure you want to delete this item?
								</div>
							</DialogHeader>
							<DialogFooter>
								<div className="push-right">
									<button className="btn" onClick={(e) => { e.preventDefault(); setOpenDeleteDialog(false) }}>Cancel</button>
									<button className="btn btn-danger" onClick={deleteItem}>Delete</button>
								</div>
							</DialogFooter>
						</ModalDialog>
					)
				}

			</form>
		</>
	)
}
