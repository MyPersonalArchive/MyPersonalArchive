import { UUID } from "crypto"


export interface BlobDisplayInfo {
	id: UUID
	numberOfPages?: number
	mimeType: string
}
