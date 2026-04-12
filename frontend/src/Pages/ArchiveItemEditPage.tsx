import React, { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { PreviewList } from "../Components/PreviewList"
import { BlobIdAndNumberOfPages } from "../Components/Preview"
import { DimensionEnum } from "../Components/Preview"
import { Preview } from "../Components/Preview"
import { tagsAtom } from "../Utils/Atoms/tagsAtom"
import { useAtomValue } from "jotai"
import { FileDropZone } from "../Components/FileDropZone"
import { RoutePaths } from "../RoutePaths"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { DatePicker } from "../Components/DatePicker"
import { Dialog } from "../Components/Dialog"
import { LocalViewer } from "../Components/Viewers/LocalViewer"
import { faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import { LightBox } from "../Components/LightBox"

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
				setId(item!.id)
				setTitle(item!.title)
				setTags(item!.tags)
				setBlobs(item!.blobs.map(blob => ({ id: blob.id, numberOfPages: blob.numberOfPages, mimeType: blob.mimeType })))
				setLabel(item!.label)
				setDocumentDate(item!.documentDate)

				dispatch(MetadataControlPath)({ action: "METADATA_LOADED", metadata: item!.metadata, dispatch: dispatch })
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

		navigate(RoutePaths.Archive.List)
	}

	const deleteItem = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.preventDefault()

		apiClient.delete("/api/archive/delete", { id: id! })
		navigate(RoutePaths.Archive.List)
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
				<header className="header">
					<h1>Edit item</h1>
				</header>

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

				{/* <div className="stack-horizontal my-4">
					<div className="mt-4 text-green-600 bg-gray-900 font-mono text-sm w-full p-2">
					//TODO: How can we connect the FileDrop in the nav area when on this page? I want files dropped/uploaded to connct to this archive item.
					</div>

					<button className="btn">Upload a file to add</button>
					<button className="btn">Select from uploaded documents and media</button>
				</div> */}

				<div>
					{/* Previewlist of files from DB */}
					<PreviewList<BlobIdAndNumberOfPages> items={blobs}
						keySelector={blob => blob.id}
						containerClassName="flex gap-4 flex-wrap my-4"
						thumbnailPreviewTemplate={
							(blob, maximize) =>
								<div key={blob.id}
									className="bg-black rounded-lg border border-black w-73 h-73 flex justify-center items-center relative action-bar-host"
									onClick={() => maximize(blob)}
								>
									<Preview blob={blob} dimension={DimensionEnum.small}/>
									<div className="action-bar">
										<button type="button" onClick={e => {maximize(blob); e.stopPropagation()}} title="Expand">
											<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
										</button>
										<button type="button" onClick={e => {removeUnallocatedBlob(blob); e.stopPropagation()}} title="Delete">
											<FontAwesomeIcon icon={faTrash} size="1x" />
										</button>
									</div>
								</div>
						}
						maximizedPreviewTemplate={
							(blob, minimize) =>
								<LightBox key={blob.id} onClose={() => minimize()}>
									<div className="w-full h-full flex justify-center action-bar-host">
										<Preview blob={blob} dimension={DimensionEnum.full}/>
										<div className="action-bar">
											<button type="button" onClick={e => {minimize(); e.stopPropagation()}} title="Minimize">
												<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
											</button>
											<button type="button" onClick={e => {removeUnallocatedBlob(blob); e.stopPropagation()}} title="Delete">
												<FontAwesomeIcon icon={faTrash} size="1x" />
											</button>
										</div>
									</div>
								</LightBox>
						}
					/>

					{/* Previewlist of local files (just added, not saved yet) */}
					<PreviewList<LocalBlob> items={localBlobs}
						keySelector={blob => blob.fileName}
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
								<LightBox key={blob.fileName} onClose={() => minimize()}>
									<LocalViewer
										blob={blob.fileData}
										fileName={blob.fileName}
										dimension={DimensionEnum.full}
										onMinimize={minimize}
										removeBlob={removeBlob}
									/>
								</LightBox>
						}
					/>
				</div>

				<div className="stack-horizontal to-the-right my-4">
					<button className="btn" onClick={() => navigate(RoutePaths.Archive.List)}>
						Back
					</button>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
					<button className="btn btn-danger" type="button" onClick={() => setOpenDeleteDialog(true)}>
						Delete
					</button>
				</div>


				{openDeleteDialog &&
					<Dialog size="medium"
						onClose={() => setOpenDeleteDialog(false)}
						closeOnEscape={false}
					>
						<div className="dialog-header">
							Are you sure you want to delete this item?
						</div>
						<div className="stack-horizontal to-the-right p-4">
							<button className="btn" type="button" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
							<button className="btn btn-danger" type="button" onClick={deleteItem}>Delete</button>
						</div>
					</Dialog>
				}
			</form>
		</>
	)
}
