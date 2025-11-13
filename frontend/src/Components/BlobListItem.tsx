import { InfoPanel } from "./InfoPanel"
import { Preview, DimensionEnum } from "./PreviewList"
import { SelectCheckbox, Selection } from "../Utils/Selection"
import { UnallocatedBlob } from "../Utils/Atoms"


export type BlobListItemProps = {
    blob: UnallocatedBlob
    attachBlob: (id: number) => void
    deleteBlobs?: (blobIds: number[]) => void
    maximize: (blob: UnallocatedBlob) => void
    selectionOfBlobs: Selection<number>
}
export const BlobListItem = ({ blob, attachBlob, deleteBlobs, maximize, selectionOfBlobs }: BlobListItemProps) => {
	return (
		<div key={blob.id} className="card grid grid-cols-3">
			<div className="w-[200px] bg-gray-200 py-1 content-center">
				<Preview key={blob.id} blob={blob} dimension={DimensionEnum.thumbnail}	onMaximize={maximize} />
			</div>

			<div className="w-full">
				<InfoPanel blob={blob} />
			</div>

			<div className="w-[300px] h-full flex flex-col justify-between">
				<div className="push-right pr-0.5">
					<SelectCheckbox selection={selectionOfBlobs} item={blob.id} />
				</div>

				<div className="push-right pr-2.5 mb-0">
					<button className="btn" onClick={() => attachBlob(blob.id)}>Add</button>
					{deleteBlobs && <button className="btn" onClick={() => deleteBlobs([blob.id])}>Delete</button>}
				</div>
			</div>
		</div>
	)
}
