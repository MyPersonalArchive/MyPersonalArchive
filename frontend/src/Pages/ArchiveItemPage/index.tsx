import { useAtomValue } from "jotai"
import { useEffect, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { useApiClient } from "../../Utils/Hooks/useApiClient"
import { useBlobsPrefetching } from "../../Utils/Hooks/useBlobsPrefetching"
import { blobsAtom } from "../../Utils/Atoms/blobsAtom"
import type { LocalBlob, CommonBlob, GetResponse } from "./types"
import { UUID } from "crypto"
import { useSaveShortcut } from "../../Utils/Hooks/useSaveShortcut"
import { RoutePaths } from "../../RoutePaths"
import { PreviewList } from "../../Components/PreviewList"
import { FileDrop } from "../../Components/FileDrop"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus } from "@fortawesome/free-solid-svg-icons"
import { MaximizedBlobPreview } from "./MaximizedBlobPreview"
import { TagsInput } from "../../Components/TagsInput"
import { ThumbnailPreview } from "./ThumbnailPreview"
import { MetadataSection } from "./MetadataSection"
import { BlobDisplayInfo } from "../../types/BlobDisplayInfo"
import { MetadataControlPath } from "../../Utils/Metadata/metadataControlReducer"
import { useMetadata } from "../../Utils/Metadata/useMetadata"
import { tagsAtom } from "../../Utils/Atoms/tagsAtom"
import { allMetadataTypes } from "../../Components/MetadataTypes"
import { ConfirmationDialog } from "../../Components/ConfirmationDialog"


type Props = {
	isNewArchiveItem: boolean
}
export const ArchiveItemPage = ({ isNewArchiveItem }: Props) => {
	const [id, setId] = useState<UUID | null>(null)
	const [title, setTitle] = useState<string>("")
	const [tags, setTags] = useState<string[]>([])
	const [notes, setNotes] = useState<string | undefined>(undefined)
	const [documentDate, setDocumentDate] = useState("")
	const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

	const [serverBlobs, setServerBlobs] = useState<BlobDisplayInfo[]>([])
	const [localBlobs, setLocalBlobs] = useState<LocalBlob[]>([])
	const allBlobs: CommonBlob[] = [
		...serverBlobs.map(blob => ({ url: `/api/blob/GetFile?blobId=${blob.id}`, mimeType: blob.mimeType, identifier: { id: blob.id } })),
		...localBlobs.map(blob => ({ url: URL.createObjectURL(blob.fileData), mimeType: blob.fileData.type, identifier: { fileName: blob.fileName } }))
	]

	const allTags = useAtomValue(tagsAtom)

	const { metadata, dispatch } = useMetadata(allMetadataTypes)

	const params = useParams()
	const location = useLocation()
	const navigate = useNavigate()
	const initialMetadataTypes: string[] = location.state?.metadataTypes ?? []	// This is set when creating a new archive item to indicate which metadata types should be initially selected and open
	
	const apiClient = useApiClient()

	useBlobsPrefetching()
	const prefetchedBlobs = useAtomValue(blobsAtom)
	

	useEffect(() => {
		if(isNewArchiveItem === false) {
			apiClient.query<GetResponse>("GetArchiveItem", { id: params.id! as UUID })
				.then(item => {
					setId(item!.id)
					setTitle(item!.title)
					setTags(item!.tags)
					setNotes(item!.notes)
					setServerBlobs(item!.blobDisplayInfos.map(blob => ({ id: blob.id, mimeType: blob.mimeType })))
					setDocumentDate(item!.documentDate ? new Date(item!.documentDate).toISOString().split("T")[0] : "")

					dispatch(MetadataControlPath)({ action: "METADATA_LOADED", metadata: item!.metadata, dispatch: dispatch })
				})
		}
	}, [])

	if(isNewArchiveItem === true && id === null) {
		setId(id => id ?? crypto.randomUUID())

		const blobIds = location.state?.blobIds ?? []
		const blobs = prefetchedBlobs.filter(blob => blobIds.includes(blob.id))
		const commonDocumentDate = location.state?.documentDate ?? null

		setTitle("untitled")
		setDocumentDate(commonDocumentDate ?? "")
		setServerBlobs(blobs.map(blob => ({ id: blob.id, mimeType: blob.mimeType })))

		initialMetadataTypes.forEach((metadataType: string) => {
			dispatch(MetadataControlPath)({ action: "SELECT_METADATA_TYPE", type: metadataType })
		})
	}

	const save = () => {
		const formData = new FormData()
		const storeRequest = {
			id: id!,
			title: title!,
			documentDate: documentDate ? new Date(documentDate) : undefined,
			tags,
			notes,
			metadata,
			existingBlobIds: serverBlobs.map(blob => blob.id)
		}

		formData.append("rawRequest", JSON.stringify(storeRequest))

		localBlobs.forEach(blob => {
			formData.append("files", blob.fileData, blob.fileName)
		})

		apiClient.putFormData("/api/archive/Store", formData)

		navigate(`${RoutePaths.Archive.Edit}/${id}`, {replace: true})
	}

	useSaveShortcut(() => { save() }, true)

	const onDeleteArchiveItem = () => {
		apiClient.execute("DeleteArchiveItem", { id: id! })
		navigate(RoutePaths.Archive.List)
	}

	// const attachUnallocatedBlobs = (newBlobs: BlobDisplayInfo[]) => {
	// 	newBlobs.forEach(blob => {
	// 		setBlobs(blobs => [...blobs, blob])
	// 	})
	// }

	const removeUnallocatedBlob = (blob: CommonBlob) => {
		if ("id" in blob.identifier) {
			const id = blob.identifier.id
			setServerBlobs(existingBlobs => existingBlobs.filter(x => x.id !== id))
		} else {
			const filename = blob.identifier.fileName
			setLocalBlobs(localBlobs.filter(localBlob => localBlob.fileName !== filename))
		}
	}


	const onFilesUploaded = (files: FileList): void => {
		const newLocalBlobs = Array.from(files).map(file => ({ fileName: file.name, fileData: file }))
		setLocalBlobs([...localBlobs, ...newLocalBlobs])
	}

	function SelectUploadedFiles(): void {
		alert("Select uploaded files - feature not implemented yet.")
	}

	return (
		<>
			<form
				onSubmit={e => { e.preventDefault(); save() }}
				className="flex flex-col gap-4"
			>

				<label
					className="dont-touch-walls input w-full"
					htmlFor="title"
				>
					<span className="label">Title</span>
					<input type="text"
						className="input input-xl"
						id="title"
						placeholder="Title"
						autoFocus data-1p-ignore
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</label>


				<div className="dont-touch-walls join">
					<label className="input">
						<span className="label">Document date</span>
						<label className="date" htmlFor="documentDate">
							<input type="date" className="input"
								value={documentDate ?? ""}
								onChange={e => setDocumentDate(e.target.value)}
							/>
						</label>
					</label>
					<button className="btn btn-outline btn-primary" type="button" onClick={() => setDocumentDate("")}>&times;</button>
				</div>

				<TagsInput
					className="dont-touch-walls"
					tags={tags}
					setTags={setTags}
					autocompleteList={Array.from(allTags)}
				/>

				<label
					className="dont-touch-walls textarea"
					htmlFor="notes"
				>
					<span className="label">Notes</span>
					<textarea
						className="input h-auto"
						id="notes"
						placeholder="Notes"
						value={notes ?? ""}
						onChange={event => setNotes(event.target.value)}
					/>
				</label>

				<div className="flex flex-col sm:gap-4">
					{
						allMetadataTypes.map(metadataType => (
							<MetadataSection
								key={metadataType.path.toString()}
								metadataType={metadataType}
								metadata={metadata}
								dispatch={dispatch}
								initiallyOpen={initialMetadataTypes.includes(metadataType.path as string)}
							/>
						))
					}
				</div>


				<div className="dont-touch-walls grid grid-cols-[repeat(auto-fill,minmax(18.25rem,1fr))] gap-4 my-4">
					<PreviewList items={allBlobs}
						thumbnailPreviewTemplate={
							(blob, maximize) =>
								<ThumbnailPreview
									key={"id" in blob.identifier ? blob.identifier.id : blob.identifier.fileName}
									blob={blob}
									maximize={maximize}
									removeUnallocatedBlob={removeUnallocatedBlob}
								/>
						}
						maximizedPreviewTemplate={
							(blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext) =>
								<MaximizedBlobPreview
									blob={blob}
									minimize={minimize}
									canMovePrevious={canMovePrevious}
									canMoveNext={canMoveNext}
									movePrevious={movePrevious}
									moveNext={moveNext}
									removeUnallocatedBlob={removeUnallocatedBlob}
								/>
						}
					/>

					<div className="btn btn-dash rounded-lg aspect-square w-full h-full p-0">
						<FileDrop
							className="w-full h-full flex flex-col justify-center items-center"
							onFilesUploaded={onFilesUploaded}
							onClickOverride={() => SelectUploadedFiles()}
						>
							<div className="text-sm">Drop file here or</div>
							<FontAwesomeIcon icon={faPlus} size="10x" />
							<div className="text-sm">click to select from uploaded files</div>
						</FileDrop>
					</div>
				</div>

				<div className="dont-touch-walls stack-horizontal to-the-right my-4 sticky bottom-0">
					<button className="btn btn-primary" type="submit">
						Save
						<kbd className="kbd kbd-sm">⌘</kbd>
						<kbd className="kbd kbd-sm">S</kbd>
					</button>
					<button className="btn btn-warning" type="button" onClick={() => setOpenDeleteDialog(true)}>
						Delete
					</button>
				</div>
			</form>
			
			<ConfirmationDialog
				open={openDeleteDialog}
				prompt="Are you sure you want to delete this item?"
				onClose={() => setOpenDeleteDialog(false)}
				onConfirm={onDeleteArchiveItem}
			/>
		</>
	)
}


