import { faFileImport } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { useAtomValue } from "jotai"
import { Blob, blobsAtom } from "../Utils/Atoms"
import { PreviewList } from "./PreviewList"
import { BlobIdAndNumberOfPages } from "./Preview"
import { DimensionEnum } from "./Preview"
import { Preview } from "./Preview"
import { SelectCheckbox, useSelection, Selection } from "../Utils/Selection"
import { formatDate, formatFileSize } from "../Utils/formatUtils"



export type FileDropZoneProps = {
	onBlobAdded?: (files: { fileName: string; fileData: Blob }[]) => void
	onBlobAttached: (blob: BlobIdAndNumberOfPages[]) => void
	showUnallocatedBlobs?: boolean
}
export const FileDropZone = ({ onBlobAdded, onBlobAttached, showUnallocatedBlobs }: FileDropZoneProps) => {
	const apiClient = useApiClient()

	const inputFileRef = useRef<HTMLInputElement | null>(null)
	const [openUnallocatedBlobDialog, setOpenUnallocatedBlobsDialog] = useState(false)

	const uploadBlobs = (blobs: { fileName: string; fileData: Blob }[]): void => {
		if (onBlobAdded) {
			onBlobAdded(blobs)
			return
		}
		const formData = new FormData()
		blobs.forEach(blob => {
			formData.append("files", blob.fileData, blob.fileName)
		})

		apiClient.postFormData("/api/blob/upload", formData)
	}

	const handleDrop = (event: any) => {
		event.preventDefault()
		const { files } = event.dataTransfer
		if (files.length > 0) {
			handleFileChange(files)
		}
	}

	const onChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		event.stopPropagation()
		event.preventDefault()

		const files = event.target.files ?? []
		handleFileChange([...files])
	}

	const handleFileChange = (files: File[]) => {
		if (!files || files.length === 0) {
			return
		}

		const fileDataArray = Array.from(files).map(file => ({
			fileName: file.name,
			fileData: file as Blob
		}))

		uploadBlobs(fileDataArray)
	}

	const handleDragOver = (event: any) => {
		event.preventDefault()

	}

	const handleDragStart = (event: any) => {
		event.dataTransfer.setData("text/plain", event.target.id)
	}

	return (
		<div className="input is-wrapper w-full">
			<input type='file' multiple
				id='file'
				ref={inputFileRef}
				style={{ display: "none" }}
				onChange={onChangeFile}
			/>
			<div draggable="true" style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
			>
				<div style={{
					height: showUnallocatedBlobs ? "7.5em" : "4.5em",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center"
				}}>
					<FontAwesomeIcon icon={faFileImport} color="gray" size="5x" />
				</div>
				<div style={{ textAlign: "center", flexGrow: 1 }}>
					<p>
						Drag and drop a file here
					</p>
					<i>or</i>
					<p>
						<button className="link" type="button" onClick={() => inputFileRef?.current?.click()}>
							Select a file to upload
						</button>
					</p>
					{
						showUnallocatedBlobs &&
						<>
							<i>or</i>
							<p>
								<button className="link" type="button" onClick={() => { setOpenUnallocatedBlobsDialog(!openUnallocatedBlobDialog) }}>
									Choose from unallocted heap.
								</button>
							</p>
						</>
					}
				</div>
			</div>
			{
				openUnallocatedBlobDialog && <UnallocatedBlobsDialog onBlobAttached={onBlobAttached} onCloseDialog={() => setOpenUnallocatedBlobsDialog(false)} />
			}
		</div>
	)
}


type UnallocatedBlobsDialogProps = {
	onCloseDialog: () => void
	onBlobAttached: (blob: BlobIdAndNumberOfPages[]) => void
}
const UnallocatedBlobsDialog = ({ onCloseDialog, onBlobAttached }: UnallocatedBlobsDialogProps) => {
	const unallocatedHeap = useAtomValue(blobsAtom)

	const selectionOfBlobs = useSelection<number>(new Set(unallocatedHeap.map(blob => blob.id)))
	const selectAllCheckboxRef = useRef<HTMLInputElement>(null)
	useEffect(() => {
		if (selectAllCheckboxRef.current !== null) {
			selectAllCheckboxRef.current.indeterminate = selectionOfBlobs.allPossibleItems.size == 0 || selectionOfBlobs.areOnlySomeItemsSelected
			selectAllCheckboxRef.current.checked = selectionOfBlobs.allPossibleItems.size > 0 && selectionOfBlobs.areAllItemsSelected
		}
	}, [selectionOfBlobs.selectedItems, unallocatedHeap])

	const addBlob = (blobIds: number[]) => {
		const blobs = unallocatedHeap.filter(blob => blobIds.includes(blob.id)).map(blob => ({ id: blob.id, numberOfPages: blob.pageCount }))
		onBlobAttached(blobs)
		onCloseDialog()
	}

	return (
		<div className="overlay-backdrop" style={{ zIndex: 1 }} onClick={onCloseDialog}>
			<div className="max-w-[95%] max-h-[95%] p-4 overflow-auto bg-white rounded-lg shadow-lg shadow-black-400 shadow-opacity-50" onClick={event => event.stopPropagation()}>
				<h1 className="heading-2">
					Select from unallocated blobs
				</h1>
				<div>

					<div className="stack-horizontal to-the-right my-4">
						<label>
							<input ref={selectAllCheckboxRef} type="checkbox"
								checked={selectionOfBlobs.areAllItemsSelected}
								onChange={() => selectionOfBlobs.areAllItemsSelected
									? selectionOfBlobs.clearSelection()
									: selectionOfBlobs.selectAllItems()
								} />
							Select all
						</label>
						<button className="btn"
							disabled={selectionOfBlobs.areNoItemsSelected}
							onClick={() => addBlob(Array.from(selectionOfBlobs.selectedItems))}
						>
							Add selected blobs
						</button>
					</div>
				</div>

				<PreviewList<Blob> items={unallocatedHeap}
					thumbnailPreviewTemplate={
						(blob, maximize) =>
							<BlobCard
								key={blob.id}
								blob={blob}
								attachBlob={() => addBlob([blob.id!])}
								maximize={maximize}
								selectionOfBlobs={selectionOfBlobs}
							/>


					}
					maximizedPreviewTemplate={
						(blob, minimize) =>
							<Preview key={blob.id} blob={blob} dimension={DimensionEnum.full}
								onMinimize={minimize} />
					}
				/>
			</div>
		</div>
	)
}


type BlobCardProps = {
	blob: Blob
	attachBlob: (id: number) => void
	maximize: (blob: Blob) => void
	selectionOfBlobs: Selection<number>
}
const BlobCard = ({ blob, attachBlob, maximize, selectionOfBlobs }: BlobCardProps) => {
	return (
		<div className="card flex flex-row relative w-[900px]">

			<div className="bg-gray-200 p-2 w-50 h-50 flex justify-center">
				<Preview key={blob.id} blob={blob} dimension={DimensionEnum.thumbnail} onMaximize={maximize} />
			</div>

			<div className="p-2 grow">
				<div className="flex flex-col py-2 px-4">
					<div className="font-bold">{blob.fileName}</div>
					<div className=" text-sm">{formatDate(new Date(blob.uploadedAt))}</div>
					<div className=" text-sm">{blob.uploadedByUser}</div>
					<div className=" text-sm">{formatFileSize(blob.fileSize)}</div>
				</div>

				<SelectCheckbox className="absolute right-2 top-2" selection={selectionOfBlobs} item={blob.id} />

				<div className="absolute bottom-2 right-2 space-x-2">
					<button className="btn" onClick={() => attachBlob(blob.id)}>Add</button>
				</div>

			</div>
		</div>
	)
}