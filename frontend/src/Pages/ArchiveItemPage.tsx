import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { UUID } from "crypto"
import { TagsInput } from "../Components/TagsInput"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { PreviewList } from "../Components/PreviewList"
import { BlobDisplayInfo } from "../types/BlobDisplayInfo"
import { DimensionEnum } from "../types/DimensionEnum"
import { tagsAtom } from "../Utils/Atoms/tagsAtom"
import { useAtom, useAtomValue } from "jotai"
import { RoutePaths } from "../RoutePaths"
import { allMetadataTypes } from "../Components/MetadataTypes"
import { useMetadata } from "../Utils/Metadata/useMetadata"
import { MetadataControlPath } from "../Utils/Metadata/metadataControlReducer"
import { MetadataElement } from "../Utils/Metadata/MetadataElement"
import { ICommand, MetadataType, ReducerIdentifier } from "../Utils/Metadata/types"
import { Dialog } from "../Components/Dialog"
import { faArrowLeft, faArrowRight, faDownLeftAndUpRightToCenter, faPlus, faToolbox, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import { LightBox } from "../Components/LightBox"
import { useSaveShortcut } from "../Utils/Hooks/useSaveShortcut"
import { FloatingToolWindow, Position, Size } from "../Components/FloatingToolWindow"
import { quickEditToolWindowIsOpenAtom } from "../Utils/Atoms"
import { FileDrop } from "../Components/FileDrop"
import { BaseViewer } from "../Components/Viewers/BaseViewer"
import { useBlobsPrefetching } from "../Utils/Hooks/useBlobsPrefetching"
import { blobsAtom } from "../Utils/Atoms/blobsAtom"

type GetResponse = {
	id: UUID
	title: string
	tags: string[]
	notes?: string
	documentDate?: string
	createdAt: string
	metadata: any
	blobDisplayInfos: {
		id: UUID
		numberOfPages: number
		mimeType: string
	}[]
}

type LocalBlob = {
	fileName: string
	fileData: Blob
}


type CommonBlob = {
	url: string
	mimeType: string
	identifier: { id: UUID } | { fileName: string }
}


type ArchiveItemPageProps = {
	isNewArchiveItem: boolean
}
export const ArchiveItemPage = ({ isNewArchiveItem }: ArchiveItemPageProps) => {
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
			
			<DeleteDialog
				open={openDeleteDialog}
				onClose={() => setOpenDeleteDialog(false)}
				onDelete={onDeleteArchiveItem}
			/>
		</>
	)
}


type DeleteDialogProps = {
	open: boolean
	onClose: () => void
	onDelete: () => void
}
const DeleteDialog = ({ open, onClose, onDelete }: DeleteDialogProps) => {
	return (
		<>
			{open &&
				<Dialog size="medium"
					onClose={onClose}
					closeOnEscape={true}
				>
					<div className="dialog-header">
						Are you sure you want to delete this item?
					</div>
					<div className="stack-horizontal to-the-right p-4">
						<button className="btn" type="button" onClick={onClose}>Cancel</button>
						<button className="btn btn-danger" type="button" onClick={e => { e.preventDefault(); onDelete() }}>Delete</button>
					</div>
				</Dialog>
			}
		</>
	)
}


type MetadataSectionProps = {
	metadataType: MetadataType
	metadata: Record<string, any>
	dispatch: (path: ReducerIdentifier) => (command: ICommand) => void
	initiallyOpen?: boolean
}
const MetadataSection = ({ metadataType, metadata, dispatch, initiallyOpen }: MetadataSectionProps) => {
	const summary = (metadataType.path in metadata) ? metadataType.summarize(metadata[metadataType.path as string]) : ""
	return (
		<div
			key={metadataType.path.toString()}
			className="collapse collapse-arrow bg-base-100 border border-base-300 has-[.delete-receipt:hover]:bg-red-100 max-sm:rounded-none max-sm:border-x-0 max-sm:border-b-0 last:border-b"
		>
			<input type="checkbox" defaultChecked={initiallyOpen} />
			<div className="collapse-title font-semibold">
				{(metadataType.path in metadata)
					? <span className="pill metadatatype">
						{metadataType.displayName}

						{summary &&
							<span className="inner pill highlight">
								{summary}
							</span>
						}
					</span>
					: <span className="pl-2">{metadataType.displayName}</span>
				}
			</div>
			<div className="collapse-content text-sm px-0">
				{!(metadataType.path in metadata)
					? <button
						type="button"
						className="btn btn-outline btn-primary mx-4"
						onClick={() => { dispatch(MetadataControlPath)({ action: "TOGGLE_METADATA_TYPE", type: metadataType.path }) }}
					>
						Create {metadataType.displayName} data
					</button>
					: <>
						<MetadataElement
							metadataType={metadataType}
							metadata={metadata}
							dispatch={dispatch(metadataType.path)}
						/>
						<button
							type="button"
							className="btn btn-outline btn-error mx-4 delete-receipt mt-4"
							onClick={() => { dispatch(MetadataControlPath)({ action: "TOGGLE_METADATA_TYPE", type: metadataType.path }) }}
						>
							Remove {metadataType.displayName} data
						</button>
					</>
				}
			</div>
		</div>
	)
}


type ThumbnailPreviewProps = {
	blob: CommonBlob
	maximize: (blob: CommonBlob) => void
	removeUnallocatedBlob: (blob: CommonBlob) => void
}
const ThumbnailPreview = ({ blob, maximize, removeUnallocatedBlob }: ThumbnailPreviewProps) => {
	return (
		<div
			key={"id" in blob.identifier
				? blob.identifier.id
				: blob.identifier.fileName
			}
			className="aspect-square bg-black rounded-lg border border-black w-full flex justify-center items-center relative action-bar-host overflow-hidden"
			onClick={() => maximize(blob)}
		>
			<BaseViewer
				url={"id" in blob.identifier
					? `/api/blob/GetFile?blobId=${blob.identifier.id}&dimension=${DimensionEnum.small}&inline=true`
					: blob.url
				}
				mimeType={blob.mimeType}
				forceImageViewer={true}
			/>
			<div className="action-bar">
				<button type="button" onClick={e => { maximize(blob); e.stopPropagation() }} title="Expand">
					<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
				</button>
				<button type="button" onClick={e => { removeUnallocatedBlob(blob); e.stopPropagation() }} title="Delete">
					<FontAwesomeIcon icon={faTrash} size="1x" />
				</button>
			</div>
		</div>)
}


type MaximizedBlobPreviewProps = {
	blob: CommonBlob
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
	removeUnallocatedBlob: (blob: CommonBlob) => void
}
const MaximizedBlobPreview = ({ blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext, removeUnallocatedBlob }: MaximizedBlobPreviewProps) => {
	const [toolWindowIsOpen, setToolWindowIsOpen] = useAtom(quickEditToolWindowIsOpenAtom)
	const [toolWindowPosition, setToolWindowPosition] = useState<Position>({ x: 100, y: 100 })
	const [toolWindowSize, setToolWindowSize] = useState<Size>({ width: 360, height: 300 })


	return (
		<LightBox key={"id" in blob.identifier ? blob.identifier.id : blob.identifier.fileName} onClose={() => minimize()}>
			<div className="w-full h-full flex justify-center action-bar-host">
				<BaseViewer
					url={"id" in blob.identifier
						? `/api/blob/GetFile?blobId=${blob.identifier.id}&dimension=${DimensionEnum.full}&inline=true`
						: blob.url
					}
					mimeType={blob.mimeType}
				/>
				{toolWindowIsOpen &&
					<ToolWindow
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
						toolWindowPosition={toolWindowPosition}
						toolWindowSize={toolWindowSize}
						setToolWindowPosition={setToolWindowPosition}
						setToolWindowSize={setToolWindowSize}
					/>
				}
				<div className="action-bar">
					<button type="button" onClick={e => { setToolWindowIsOpen(!toolWindowIsOpen); e.stopPropagation() }} title="Quick registration tool">
						<FontAwesomeIcon icon={faToolbox} size="1x" />
					</button>

					<button type="button" disabled={!canMovePrevious} onClick={e => { movePrevious(); e.stopPropagation() }} title="Prev">
						<FontAwesomeIcon icon={faArrowLeft} size="1x" />
					</button>
					<button type="button" disabled={!canMoveNext} onClick={e => { moveNext(); e.stopPropagation() }} title="Next">
						<FontAwesomeIcon icon={faArrowRight} size="1x" />
					</button>
					<button type="button" onClick={e => { minimize(); e.stopPropagation() }} title="Minimize">
						<FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
					</button>
					<button type="button" onClick={e => { removeUnallocatedBlob(blob); e.stopPropagation() }} title="Delete">
						<FontAwesomeIcon icon={faTrash} size="1x" />
					</button>
				</div>
			</div>
		</LightBox>

	)
}


type ToolWindowProps = {
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
	toolWindowPosition: Position
	toolWindowSize: Size
	setToolWindowPosition: (position: Position) => void
	setToolWindowSize: (size: Size) => void
}
const ToolWindow = ({ setToolWindowIsOpen, toolWindowPosition, toolWindowSize, setToolWindowPosition, setToolWindowSize }: ToolWindowProps) => {
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

			<div className="todo">
				//TODO:<br />
				Show page or tab to edit each metadata type<br />
			</div>

		</FloatingToolWindow>
	)
}
