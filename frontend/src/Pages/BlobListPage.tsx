import { useRef, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useAtom, useAtomValue } from "jotai"
import { BlobMetadata, blobsAtom } from "../Utils/Atoms/blobsAtom"
import { PreviewList } from "../Components/PreviewList"
import { DimensionEnum } from "../Components/Preview"
import { Preview } from "../Components/Preview"
import { useSelection, Selection, SelectCheckbox } from "../Utils/Selection"
import { createQueryString } from "../Utils/createQueryString"
import { dateToShortDateDisplay, formatSize } from "../Utils/formatUtils"
import { faArrowLeft, faArrowRight, faDownLeftAndUpRightToCenter, faToolbox, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { LightBox } from "../Components/LightBox"
import { UUID } from "crypto"
import { archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { FloatingToolWindow } from "../Components/FloatingToolWindow"
import { quickRegistrationModeAtom, quickRegistrationToolWindowIsOpenAtom } from "../Utils/Atoms"


export const BlobListPage = () => {
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

	const deleteVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		await apiClient.execute("DeleteBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
	}

	const deleteBlob = (blobId: UUID) => {
		apiClient.execute("DeleteBlobs", { blobIds: [blobId] })
	}

	const createArchiveItemFromVisibleSelectedBlobs = async () => {
		if (selectionOfBlobs.areNoItemsSelected) return

		const visibleBlobIds = visibleBlobs.filter(blob => selectionOfBlobs.selectedItems.has(blob.id)).map(b => b.id)
		const newArchiveItemId = await apiClient.get<UUID>("/api/archive/CreateAndAttachBlobs", { blobIds: visibleBlobIds })

		selectionOfBlobs.clearSelection()
		navigate(`${RoutePaths.Archive.Edit}/${newArchiveItemId}`)
	}

	const attachBlob = async (id: UUID) => {
		const newArchiveItemId = await apiClient.get<UUID>("/api/archive/CreateAndAttachBlobs", { blobIds: [id] })
		navigate(`${RoutePaths.Archive.Edit}/${newArchiveItemId}`)
	}

	return (
		<>
			<header className="header">
				<h1>Documents and media</h1>
			</header>

			<Filter />

			<div className="stack-horizontal to-the-right my-4">
				<label>
					<input ref={selectAllCheckboxRef} type="checkbox"
						checked={selectionOfBlobs.areAllItemsSelected}
						onChange={() => selectionOfBlobs.areAllItemsSelected
							? selectionOfBlobs.clearSelection()
							: selectionOfBlobs.selectAllItems()		//TODO: Find a way to select only visible blobs
						} />
					Select all
				</label>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={createArchiveItemFromVisibleSelectedBlobs}
				>
					Create from {selectedVisibleBlobs.length} selected
				</button>

				<button className="btn"
					disabled={selectionOfBlobs.areNoItemsSelected}
					onClick={deleteVisibleSelectedBlobs}
				>
					Delete {selectedVisibleBlobs.length} selected
				</button>
			</div>

			<PreviewList<BlobMetadata> items={visibleBlobs}
				containerClassName="flex flex-col gap-3"
				keySelector={blob => blob.id}
				thumbnailPreviewTemplate={
					(blob, maximize) => <BlobCard
						key={blob.id}
						blob={blob}
						attachBlob={attachBlob}
						deleteBlob={deleteBlob}
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

		</>
	)
}


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

	return (
		<LightBox key={blob.id} onClose={() => minimize()} closeOnEscape={!toolWindowIsOpen}>
			<div className="w-full h-full flex justify-center action-bar-host">
				{toolWindowIsOpen &&
					<ToolWindow
						canMoveNext={canMoveNext}
						moveNext={moveNext}
						setToolWindowIsOpen={setToolWindowIsOpen}
					/>
				}
				<Preview blob={blob} dimension={DimensionEnum.full} />
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
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
}
const ToolWindow = ({ canMoveNext, moveNext, setToolWindowIsOpen }: ToolWindowProps) => {
	const [registrationMode, setRegistrationMode] = useAtom(quickRegistrationModeAtom)
	const firstInputRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		firstInputRef.current?.focus()
	}, [])

	const register = (metadataType: string) => {
		switch (registrationMode) {
			case "createAndEdit":
				// Navigate to edit mode
				//TODO: 
				alert(`Navigate to edit mode (not implemented yet): ${metadataType}`)
				break

			case "createAndMove":
				if (canMoveNext) moveNext()
				break
		}
	}

	return (
		<FloatingToolWindow title="Quick create archive item"
			className="flex flex-col gap-2 p-2"
			initialPosition={{ x: 100, y: 100 }}
			initialSize={{ width: 360, height: 300 }}
			minWidth={268} minHeight={171}
			onClose={() => { setToolWindowIsOpen?.(false) }}
			closeOnEscape={true}
		>
			<input ref={firstInputRef} type="text" className="input w-full" placeholder="Name of archived item" />
			<div className="flex flex-row gap-2">
				<button className="btn flex-1" onClick={() => register("receipt")}>receipt</button>
				<button className="btn flex-1" onClick={() => register("travel-document")}>travel document</button>
			</div>
			<button className="btn" disabled={!canMoveNext} onClick={() => { moveNext() }} title="Move to next without registering">Move to next without registering</button>
			<div className="flex-1"></div>
			<label>
				<input type="radio"
					name="navigationMode"
					value="createAndMove"
					checked={registrationMode === "createAndMove"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")} /> Just create it and move to next
			</label>
			<label>
				<input type="radio"
					name="navigationMode"
					value="createAndEdit"
					checked={registrationMode === "createAndEdit"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")} /> Create and enter edit mode
			</label>

			<div className="todo">
				//TODO:<br/>
				- Radiobuttons for select the date: uploaded date, document date (EXIF etc?), todays date or enter date manually?<br/>
			</div>
		</FloatingToolWindow>
	)
}


type BlobCardProps = {
	blob: BlobMetadata
	attachBlob: (id: UUID) => void
	deleteBlob: (blobId: UUID) => void
	maximize: (blob: BlobMetadata) => void
	selectionOfBlobs: Selection<UUID>
}
const BlobCard = ({ blob, attachBlob, deleteBlob, maximize, selectionOfBlobs }: BlobCardProps) => {
	return (
		<div className="card flex flex-row relative">

			<div className="bg-black border border-black w-40 h-40 flex justify-center items-center action-bar-host"
				onClick={() => maximize(blob)}
			>
				<Preview blob={blob} dimension={DimensionEnum.thumbnail} />

				<div className="action-bar">
					<button type="button" onClick={e => { maximize(blob); e.stopPropagation() }} title="Expand">
						<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
					</button>
				</div>
			</div>

			<div className="p-2 grow">
				<div className="flex flex-col py-2 px-4">
					<div className="font-bold">{blob.fileName}</div>
					<div className=" text-sm">{dateToShortDateDisplay(blob.uploadedAt)}</div>
					<div className=" text-sm">{blob.uploadedByUser}</div>
					<div className=" text-sm">{formatSize(blob.fileSize)}</div>
				</div>

				<SelectCheckbox className="absolute right-2 top-2" selection={selectionOfBlobs} item={blob.id} />

				<div className="absolute bottom-2 right-2 space-x-2">
					<button className="btn" onClick={() => attachBlob(blob.id)}>Add</button>
					<button className="btn" onClick={() => deleteBlob(blob.id)}>Delete</button>
				</div>

			</div>
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
		<div className="stack-horizontal to-the-left my-4">
			<label>
				<input type="checkbox" checked={hideAllocatedBlobs} onChange={() => setHideAllocatedBlobs(b => !b)} />
				Hide allocated blobs
			</label>
		</div>
	)
}