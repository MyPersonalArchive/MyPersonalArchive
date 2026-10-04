import { Dialog } from "../../Components/Dialog"
import { useBlobList } from "../../Utils/Hooks/useBlobList"
import { BaseViewer } from "../../Components/Viewers/BaseViewer"
import { useState } from "react"
import { DimensionEnum } from "../../types/DimensionEnum"
import { SelectCheckbox } from "../../Utils/Selection"
import { BlobMetadata } from "../../Utils/Atoms/blobsAtom"


type Props = {
	open: boolean
	onClose: (selectedBlobs: BlobMetadata[]) => void
}
export const BlobSelectionDialog = ({ open, onClose }: Props) => {
	const [showAllocatedBlobs, setShowAllocatedBlobs] = useState(false)
	const {
		visibleBlobs,
		selectionOfBlobs,
		selectAllCheckboxRef,
		selectedVisibleBlobs,
	 } = useBlobList(showAllocatedBlobs)
	
	return (
		open &&
		<Dialog
			size="large"
			onClose={() => onClose([])}
			closeOnEscape={true}
		>
			<div className="p-4">
				<h2 className="text-lg font-bold">Select more documents and media</h2>

				<div className="flex flex-row mb-2 sticky-top bg-base-200 sticky-top-gradient">
					<label className="whitespace-nowrap">
						<input
							type="checkbox"
							className="checkbox mx-2 sm:ml-0"
							checked={!showAllocatedBlobs}
							onChange={() => setShowAllocatedBlobs(!showAllocatedBlobs)}
						/>
						Hide allocated blobs
					</label>

					<div className="flex-1"></div>

					<label className="whitespace-nowrap">
						Select all
						<input
							ref={selectAllCheckboxRef}
							type="checkbox"
							className="checkbox ml-2 sm:mr-2"
							checked={selectionOfBlobs.areAllItemsSelected}
							onChange={() => selectionOfBlobs.areAllItemsSelected
								? selectionOfBlobs.clearSelection()
								: selectionOfBlobs.selectAllItems()
							} />
					</label>
				</div>

				<div className="grid grid-cols-3 gap-4">
					{ visibleBlobs.map(blob => (
						<div
							key={blob.id}
							className="aspect-square bg-black rounded-lg border border-black w-full flex justify-center items-center relative overflow-hidden"
						>
							<BaseViewer
								url={`/api/blob/GetFile?blobId=${blob.id}&dimension=${DimensionEnum.thumbnail}&inline=true`}
								mimeType={blob.mimeType}
								forceImageViewer={true}
							/>
							<div className="absolute top-0 right-0 bg-black/50 rounded-bl-lg p-2">
								<SelectCheckbox
									className=" bg-white"
									selection={selectionOfBlobs}
									item={blob.id}
								/>
							</div>
						</div>
					)) }
				</div>


				<div className="dont-touch-walls stack-horizontal to-the-right mb-4 sticky-bottom bg-base-200 sticky-bottom-gradient">
					<div className="flex justify-end gap-2 mt-4">
						<button className="btn btn-secondary" onClick={() => onClose([])}>Close</button>
						<button className="btn btn-primary whitespace-nowrap"
							disabled={selectionOfBlobs.areNoItemsSelected}
							onClick={() => onClose(selectedVisibleBlobs)}
						>
						Add {selectedVisibleBlobs.length} selected
						</button>
					</div>

				</div>
			</div>
		</Dialog>
	)
}
