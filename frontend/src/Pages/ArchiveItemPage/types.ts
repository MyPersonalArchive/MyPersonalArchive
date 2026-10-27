import { UUID } from "crypto"


export type GetResponse = {
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

export type LocalBlob = {
	fileName: string
	fileData: File
	url: string
}

export type CommonBlob = {
	url: string
	mimeType: string
	identifier: { id: UUID } | { fileName: string }
	/** Set for files that are not uploaded yet, so their in-browser OCR can be used. */
	localFile?: File
}
