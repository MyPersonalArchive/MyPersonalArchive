import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { tagsAtom } from "../Utils/Atoms/tagsAtom"
import { RoutePaths } from "../RoutePaths"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { PreviewList } from "../Components/PreviewList"
import { BlobIdAndNumberOfPages } from "../Components/Preview"
import { DimensionEnum } from "../Components/Preview"
import { Preview } from "../Components/Preview"
import { DatePicker } from "../Components/DatePicker"
import { LocalViewer } from "../Components/Viewers/LocalViewer"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { LightBox } from "../Components/LightBox"

type CreateResponse = {
	id: number
}

export const ArchiveItemNewPage = () => {
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const [label] = useState<string>()
	const [documentDate, setDocumentDate] = useState<string | undefined>(undefined)
	const [localBlobs, setLocalBlobs] = useState<({ fileName: string, fileData: Blob }[])>([])
	const [blobsFromUnallocated, setBlobsFromUnallocated] = useState<BlobIdAndNumberOfPages[]>([])

	const allTags = useAtomValue(tagsAtom)

	const { selectedMetadataTypes, metadata, dispatch } = useMetadata(allMetadataTypes)

	const navigate = useNavigate()
	const apiClient = useApiClient()

	const save = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		const formData = new FormData()
		const createRequest = {
			title,
			tags,
			blobsFromUnallocated: blobsFromUnallocated.map(b => b.id),
			metadata,
			label,
			documentDate
		}

		formData.append("rawRequest", JSON.stringify(createRequest))

		localBlobs.forEach(blob => {
			formData.append("files", blob.fileData, blob.fileName)
		})

		apiClient.postFormData<CreateResponse>("/api/archive/create", formData)
		navigate(RoutePaths.Archive)
	}

	const addFileBlobs = (blobs: { fileName: string, fileData: Blob }[]) => {
		setLocalBlobs([...localBlobs, ...blobs])
	}

	const removeBlob = (fileName: string) => {
		setLocalBlobs(localBlobs.filter(blob => blob.fileName !== fileName))
	}

	const attachUnallocatedBlobs = (blobs: BlobIdAndNumberOfPages[]) => {
		setBlobsFromUnallocated(blobsFromUnallocated => [...blobsFromUnallocated, ...blobs])
	}

	const removeUnallocatedBlob = (blob: BlobIdAndNumberOfPages) => {
		setBlobsFromUnallocated(blobsFromUnallocated => blobsFromUnallocated.filter(x => x.id !== blob.id))
	}

	return (
		<>
			<form onSubmit={save}>
				<h1 className="heading-1">
					New archive item {title}
				</h1>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="title">Title</label>
					<input type="text"
						className="input"
						id="title" placeholder="" autoFocus required data-1p-ignore
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="documentDate">Document date</label>
					<DatePicker date={documentDate ?? ""} setDate={setDocumentDate} />
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="tags">Tags</label>
					<TagsInput tags={tags} setTags={setTags} htmlId="tags" autocompleteList={allTags} />
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

				<FileDropZone showUnallocatedBlobs={true}
					onBlobAdded={addFileBlobs}
					onBlobAttached={attachUnallocatedBlobs}
				/>

				<div>
					<PreviewList items={blobsFromUnallocated} containerClassName="flex flex-wrap"
						thumbnailPreviewTemplate={(blob, maximize) =>
							<div className="action-bar-host">
								<Preview key={blob.id} blob={blob} dimension={DimensionEnum.small} />
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
						maximizedPreviewTemplate={(blob, minimize) =>
							<LightBox onClose={() => minimize()} className="action-bar-host">
								<Preview key={blob.id} blob={blob} dimension={DimensionEnum.full} />
								<div className="action-bar">
									<button type="button" onClick={e => {minimize(); e.stopPropagation()}} title="Minimize">
										<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
									</button>
									<button type="button" onClick={e => {removeUnallocatedBlob(blob); e.stopPropagation()}} title="Delete">
										<FontAwesomeIcon icon={faTrash} size="1x" />
									</button>
								
								</div>
							</LightBox>
						}
					/>

				</div>

				<PreviewList<{ fileName: string, fileData: Blob }> items={localBlobs}
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

				<div className="stack-horizontal to-the-right my-4">
					<button className="btn" onClick={() => navigate(RoutePaths.Archive.List)}>
						Back
					</button>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
				</div>
			</form >
		</>
	)
}
