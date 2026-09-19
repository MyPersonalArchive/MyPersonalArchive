import { useRef, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useAtom, useAtomValue } from "jotai"
import { BlobMetadata, blobsAtom } from "../Utils/Atoms/blobsAtom"
import { PreviewList } from "../Components/PreviewList"
import { DimensionEnum } from "../types/DimensionEnum"
import { useSelection, Selection, SelectCheckbox } from "../Utils/Selection"
import { createQueryString } from "../Utils/createQueryString"
import { dateToShortDateDisplay, formatSize } from "../Utils/formatUtils"
import { faArrowLeft, faArrowRight, faDownLeftAndUpRightToCenter, faToolbox, faTrash, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { LightBox } from "../Components/LightBox"
import { UUID } from "crypto"
import { archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { FloatingToolWindow } from "../Components/FloatingToolWindow"
import { quickRegistrationModeAtom, quickRegistrationToolWindowIsOpenAtom } from "../Utils/Atoms"
import { RoutePaths } from "../RoutePaths"
import { ServerViewer } from "../Components/Viewers/ServerViewer"
import { Dialog } from "../Components/Dialog"


export const BlobListPage = () => {
	const [openDeleteAllSelectedDialog, setOpenDeleteAllSelectedDialog] = useState(false)

	const navigate = useNavigate()
	const apiClient = useApiClient()
	const [searchParams] = useSearchParams()

	const blobs = useAtomValue(blobsAtom)
	const archiveItems = useAtomValue(archiveItemsAtom)
	const allocatedBlobs = new Set<UUID>(archiveItems.flatMap(ai => ai.blobIds))

	const selectionOfBlobs = useSelection<UUID>(new Set(blobs.map(blob => blob.id)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.allPossibleItems.size == 0 || selectionOfBlobs.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfBlobs.allPossibleItems.size > 0 && selectionOfBlobs.areAllItemsSelected
		}
	}, [selectionOfBlobs.selectedItems, blobs])

	const visibleBlobs = blobs.filter(blob => (searchParams.get("hideAllocatedBlobs") !== "true") || !allocatedBlobs.has(blob.id))

	const selectedVisibleBlobs = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))

	const onDeleteVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		await apiClient.execute("DeleteBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
	}

	const onDeleteBlob = (blobId: UUID) => {
		apiClient.execute("DeleteBlobs", { blobIds: [blobId] })
	}

	const createArchiveItemFromVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const blobsToAttach = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id))

		const firstUploadDate = blobsToAttach[0]?.uploadedAt.toISOString().split("T")[0]
		const commonDocumentDate = blobsToAttach.length > 0 && blobsToAttach.every(blob => blob.uploadedAt.toISOString().split("T")[0] === firstUploadDate)
			? firstUploadDate
			: null
		const state = {
			blobIds: blobsToAttach.map(blob => blob.id),
			metadataTypes: [],
			documentDate: commonDocumentDate,	
		}
		navigate(`${RoutePaths.Archive.New}`, { state })

		selectionOfBlobs.clearSelection()
	}

	const onCreateArchiveItem = async (blob: BlobMetadata) => {
		const state = {
			blobIds: [blob.id],
			metadataTypes: [],
			documentDate: blob.uploadedAt.toISOString().split("T")[0],

		}
		navigate(`${RoutePaths.Archive.New}`, { state })
	}

	return (
		<>
			<div className="full-width-non-bordered flex flex-col gap-2">
				<Filter />
			</div>

			<div className="full-width-non-bordered flex flex-row flex-wrap gap-2 items-center my-4">

				<button className="btn btn-primary whitespace-nowrap"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={createArchiveItemFromVisibleSelectedBlobs}
				>
					Create from {selectedVisibleBlobs.length} selected
				</button>

				<button className="btn btn-warning whitespace-nowrap "
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={() => setOpenDeleteAllSelectedDialog(true)}
				>
					Delete {selectedVisibleBlobs.length} selected
				</button>

				<div className="flex-1"></div>

				<label className="whitespace-nowrap">
					Select all
					<input
						ref={selectAllCheckboxRef}
						type="checkbox"
						className="checkbox mx-2"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()		//TODO: Find a way to select only visible blobs
						} />
				</label>
			</div>


			<div className="border-y sm:border-x sm:rounded-lg overflow-hidden border-base-300">
				<PreviewList<BlobMetadata> items={visibleBlobs}
					thumbnailPreviewTemplate={
						(blob, maximize) => <Row
							key={blob.id}
							blob={blob}
							onCreateArchiveItem={onCreateArchiveItem}
							onDeleteBlob={onDeleteBlob}
							maximize={maximize}
							selectionOfBlobs={selectionOfBlobs}
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
							/>
					}
				/>
			</div>

			<DeleteDialog
				open={openDeleteAllSelectedDialog}
				prompt="Are you sure you want to delete all selected uploads?"
				onClose={() => setOpenDeleteAllSelectedDialog(false)}
				onDelete={onDeleteVisibleSelectedBlobs}
			/>
		</>
	)
}


type Position = { x: number; y: number }
type Size = { width: number; height: number }

type MaximizedBlobPreviewProps = {
	blob: BlobMetadata
	minimize: () => void
	canMovePrevious: boolean
	canMoveNext: boolean
	movePrevious: () => void
	moveNext: () => void
}
const MaximizedBlobPreview = ({ blob, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext }: MaximizedBlobPreviewProps) => {
	const [toolWindowIsOpen, setToolWindowIsOpen] = useAtom(quickRegistrationToolWindowIsOpenAtom)
	const [toolWindowPosition, setToolWindowPosition] = useState<Position>({ x: 100, y: 100 })
	const [toolWindowSize, setToolWindowSize] = useState<Size>({ width: 360, height: 250 })

	return (
		<LightBox key={blob.id} onClose={() => minimize()} closeOnEscape={!toolWindowIsOpen}>
			<div className="w-full h-full flex justify-center action-bar-host">
				{toolWindowIsOpen &&
					<ToolWindow
						blob={blob}
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
						toolWindowPosition={toolWindowPosition}
						toolWindowSize={toolWindowSize}
						setToolWindowPosition={setToolWindowPosition}
						setToolWindowSize={setToolWindowSize}
					/>
				}
				<ServerViewer
					blobId={blob.id}
					mimeType={blob.mimeType}
					dimension={DimensionEnum.full}
				/>
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
				</div>
			</div>
		</LightBox>
	)
}


type ToolWindowProps = {
	blob: BlobMetadata
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
	toolWindowPosition: Position
	toolWindowSize: Size
	setToolWindowPosition: (position: Position) => void
	setToolWindowSize: (size: Size) => void
}
const ToolWindow = ({ blob, canMoveNext, moveNext, setToolWindowIsOpen, toolWindowPosition, toolWindowSize, setToolWindowPosition, setToolWindowSize }: ToolWindowProps) => {
	const [registrationMode, setRegistrationMode] = useAtom(quickRegistrationModeAtom)
	const firstInputRef = useRef<HTMLInputElement>(null)
	const [title, setTitle] = useState<string>()

	const apiClient = useApiClient()
	const navigate = useNavigate()

	useEffect(() => {
		firstInputRef.current?.focus()
	}, [])

	const register = (selectedMetadataType?: string) => {
		switch (registrationMode) {
			case "createAndEdit": {
				const state = {
					blobIds: [blob.id],
					metadataTypes: selectedMetadataType === undefined ? [] : [selectedMetadataType],
					documentDate: blob.uploadedAt.toISOString().split("T")[0]
				}
				navigate(`${RoutePaths.Archive.New}`, { state })
				break
			}

			case "createAndMove": {
				const formData = new FormData()
				const metadata = selectedMetadataType === undefined
					? {}
					: { [selectedMetadataType ?? ""]: {} }
				const storeRequest = {
					id: crypto.randomUUID(),
					title: title,
					documentDate: blob.uploadedAt.toISOString().split("T")[0],
					tags: [],
					notes: "",
					metadata,
					existingBlobIds: [blob.id]
				}

				formData.append("rawRequest", JSON.stringify(storeRequest))

				apiClient.putFormData("/api/archive/Store", formData)

				if (canMoveNext) moveNext()
				break
			}
		}
	}

	return (
		<FloatingToolWindow title="Quick create archive item"
			className="flex flex-col gap-2 p-2"
			initialPosition={toolWindowPosition}
			initialSize={toolWindowSize}
			onPositionChange={setToolWindowPosition}
			onSizeChange={setToolWindowSize}
			minWidth={268} minHeight={171}
			onClose={() => { setToolWindowIsOpen?.(false) }}
			closeOnEscape={true}
		>
			<input ref={firstInputRef} type="text" className="input w-full" placeholder="Name of archived item" value={title} onChange={(e) => setTitle(e.target.value)} />
			<div className="flex flex-row gap-2">
				<button className="btn flex-1" onClick={() => register("receipt")}>receipt</button>
				<button className="btn flex-1" onClick={() => register("travel-document")}>travel document</button>
			</div>

			{
				registrationMode === "createAndEdit"
					? <button
						className="btn"
						disabled={!canMoveNext}
						onClick={() => { register("") }}
					>
						Register
					</button>
					: <button
						className="btn"
						onClick={() => { moveNext() }}
					>
						Move to next without registering
					</button>
			}

			<div className="flex-1"></div>
			<label>
				<input type="radio"
					className="mr-2"
					name="navigationMode"
					value="createAndMove"
					checked={registrationMode === "createAndMove"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")}
				/>
				Just create it and move to next
			</label>
			<label>
				<input type="radio"
					className="mr-2"
					name="navigationMode"
					value="createAndEdit"
					checked={registrationMode === "createAndEdit"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")}
				/>
				Create and enter edit mode
			</label>
		</FloatingToolWindow>
	)
}


type RowProps = {
	blob: BlobMetadata
	onCreateArchiveItem: (blob: BlobMetadata) => void
	onDeleteBlob: (blobId: UUID) => void
	maximize: (blob: BlobMetadata) => void
	selectionOfBlobs: Selection<UUID>
}
const Row = ({ blob, onCreateArchiveItem, onDeleteBlob, maximize, selectionOfBlobs }: RowProps) => {
	const [openDeleteThisDialog, setOpenDeleteThisDialog] = useState(false)

	return (
		<div className="div-row group/blob-row grid grid-cols-[10rem_1fr] relative has-[.delete-blob:hover]:bg-red-100">

			<div className="bg-black border border-black h-40 flex justify-center items-center action-bar-host"
				onClick={() => maximize(blob)}
			>
				<ServerViewer
					blobId={blob.id}
					mimeType={blob.mimeType}
					dimension={DimensionEnum.thumbnail}
				/>

				<div className="action-bar">
					<button type="button" onClick={e => { maximize(blob); e.stopPropagation() }} title="Expand">
						<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
					</button>
				</div>
			</div>

			<div className="p-2">
				<div className="flex flex-col py-2 px-4">
					<div className="font-bold">{blob.fileName}</div>
					<div className=" text-sm">{dateToShortDateDisplay(blob.uploadedAt)}</div>
					<div className=" text-sm">{blob.uploadedByUser}</div>
					<div className=" text-sm">{formatSize(blob.fileSize)}</div>
				</div>

				<SelectCheckbox className="absolute right-2 top-2" selection={selectionOfBlobs} item={blob.id} />

				<div className="absolute bottom-2 right-2 space-x-2">
					<button
						className="btn btn-primary"
						disabled={selectionOfBlobs.selectedItems.size > 1}
						onClick={() => onCreateArchiveItem(blob)}
					>
						Create archive item
					</button>
					<button
						className="btn btn-danger btn-square delete-blob group-hover/blob-row:text-red-500 hover:bg-red-100"
						onClick={() => setOpenDeleteThisDialog(true)}
					>
						<FontAwesomeIcon icon={faTrash} size="1x" />
					</button>
				</div>
			</div>

			<DeleteDialog
				open={openDeleteThisDialog}
				prompt="Are you sure you want to delete this upload?"
				onClose={() => setOpenDeleteThisDialog(false)}
				onDelete={() => {
					onDeleteBlob(blob.id)
				}}
			/>

		</div>
	)
}


const Filter = () => {
	const [hideAllocatedBlobs, setHideAllocatedBlobs] = useState<boolean>(true)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setHideAllocatedBlobs((searchParams.get("hideAllocatedBlobs") ?? "true") === "true")
	}, [searchParams])

	useEffect(() => {
		navigate({
			search: createQueryString({ hideAllocatedBlobs }, { skipEmptyStrings: true })
		})
	}, [hideAllocatedBlobs])

	return (
		<div>
			<label className="whitespace-nowrap">
				<input
					type="checkbox"
					className="checkbox mr-2"
					checked={hideAllocatedBlobs}
					onChange={() => setHideAllocatedBlobs(b => !b)}
				/>
				Hide allocated blobs
			</label>
		</div>
	)
}


type DeleteDialogProps = {
	open: boolean
	prompt: string
	onClose: () => void
	onDelete: () => void
}
const DeleteDialog = ({ open, prompt, onClose, onDelete }: DeleteDialogProps) => {
	return (
		<>
			{open &&
				<Dialog size="medium"
					onClose={onClose}
					closeOnEscape={true}
				>
					<div className="dialog-header">
						{prompt}
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