import { useAtomValue } from "jotai"
import { StoredFilterSelector } from "../Components/Filter/StoredFilterSelector"
import { blobsAtom } from "../Utils/Atoms/blobsAtom"
import { archiveItemsAtom } from "../Utils/Atoms/archiveItemsAtom"
import { PreviewList } from "../Components/PreviewList"
import type { UUID } from "crypto"

export const ListPage = () => {
	const archiveItems = useAtomValue(archiveItemsAtom)
	const blobs = useAtomValue(blobsAtom)

	const allocatedBlobs = new Set<UUID>(archiveItems.flatMap(ai => ai.blobIds))

	// 3 modes:
	// - only blobs - show all
	// - only archive items - show all
	// - both - show all blobs that are not allocated, and all archive items

	const list = [
		...blobs
			.filter(blob => !allocatedBlobs.has(blob.id))
			.map(blob => ({
				type: "blob" as const,
				id: blob.id,
				title: blob.fileName
			})),
		...archiveItems.map(item => ({
			type: "archiveItem" as const,
			id: item.id,
			title: item.title,
		}))
	].sort((a, b) => a.title.localeCompare(b.title))

	return (
		<>
			<header className="header">
				<h1>My personal archive</h1>
			</header>
			<div className="flex flex-row gap-2 mb-4">
				<button type="button" className="btn" >Everything</button>
				<button type="button" className="btn" >Docs and media</button>
				<button type="button" className="btn" >Archived docs and media</button>
			</div>
			<StoredFilterSelector />
			<div className="h-4"></div>

			<PreviewList items={list}
				keySelector={item => item.id}
				thumbnailPreviewTemplate={(item, maximize) =>
					<div>
						<button type="button" className="btn" onClick={() => maximize(item)}>THUMBNAIL for {item.title} - {item.type}</button>
					</div>
				}
				maximizedPreviewTemplate={(item, minimize, canMovePrevious, canMoveNext, movePrevious, moveNext) =>
					<div>
						<button type="button" className="btn" onClick={() => minimize()}>CLOSE PREVIEW for {item.title}</button>
					</div>
				} />

		</>
	)
}