import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAtomValue } from "jotai"
import { TagsInput } from "../Components/TagsInput"
import { FileDropZone } from "../Components/FileDropZone"
import { LocalFilePreview } from "../Components/LocalFilePreview"
import { useApiClient } from "../Utils/useApiClient"
import { tagsAtom } from "../Utils/Atoms"
import { RoutePaths } from "../RoutePaths"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { MetadataTypeSelector } from "../Utils/Metadata/MetadataTypeSelector"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { BlobIdAndNumberOfPages, DimensionEnum, Preview, PreviewList } from "../Components/PreviewList"
import { DatePicker } from "../Components/DatePicker"
import { LocalViewer } from "../Components/Viewers/LocalViewer"

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
			blobsFromUnallocated,
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
				<h1 className="heading-2">
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
							<Preview key={blob.id} blob={blob} dimension={DimensionEnum.small}
								onRemove={removeUnallocatedBlob}
								onMaximize={() => maximize(blob)} />
						}
						maximizedPreviewTemplate={(blob, minimize) =>
							<Preview key={blob.id} blob={blob} dimension={DimensionEnum.full}
								onRemove={removeUnallocatedBlob}
								onMaximize={() => minimize()} />
						}
					/>

				</div>
				
				<PreviewList<{fileName: string, fileData: Blob}> blobs={localBlobs}
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

				<div className="push-right">
					<Link className="link align-with-btn" to={-1 as any}>
						Back
					</Link>
					<button className="btn btn-primary" type="submit">
						Save
					</button>
				</div>
			</form >
		</>
	)
}
