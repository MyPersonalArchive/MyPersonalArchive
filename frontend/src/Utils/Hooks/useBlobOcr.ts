import { useEffect, useState } from "react"
import { useApiClient } from "./useApiClient"
import type { BlobOcr } from "../OCR/types"


type GetBlobOcrResponse = {
	exists: boolean
	ocr?: BlobOcr | null
}

type BlobOcrState = {
	status: "idle" | "loading" | "ready" | "error"
	ocr?: BlobOcr | null
	error?: string
}

// OCR for a blob rarely changes, so the result can be cached for the session.
const ocrCache = new Map<string, BlobOcr | null>()


/**
 * Drops the cached result, e.g. after OCR was (re-)run for the blob. Bump the refresh key
 * afterwards to make the hook fetch again.
 */
export const invalidateBlobOcr = (blobId: string) => {
	ocrCache.delete(blobId)
}


export const useBlobOcr = (blobId: string | undefined, refreshKey: number = 0): BlobOcrState => {
	const apiClient = useApiClient()
	const [loaded, setLoaded] = useState<{ blobId: string, refreshKey: number, ocr: BlobOcr | null }>()
	const [failed, setFailed] = useState<{ blobId: string, refreshKey: number, message: string }>()

	useEffect(() => {
		if (!blobId || ocrCache.has(blobId)) {
			return
		}

		let isCancelled = false

		apiClient.query<GetBlobOcrResponse>("GetBlobOcr", { id: blobId })
			.then(response => {
				const ocr = response?.exists ? response.ocr ?? null : null
				ocrCache.set(blobId, ocr)
				if (!isCancelled) {
					setLoaded({ blobId, refreshKey, ocr })
				}
			})
			.catch(error => {
				if (!isCancelled) {
					setFailed({ blobId, refreshKey, message: error instanceof Error ? error.message : String(error) })
				}
			})

		return () => { isCancelled = true }
	}, [blobId, refreshKey])

	if (!blobId) {
		return { status: "idle" }
	}

	const cached = ocrCache.get(blobId)
	if (cached !== undefined) {
		return { status: "ready", ocr: cached }
	}

	if (failed?.blobId === blobId && failed.refreshKey === refreshKey) {
		return { status: "error", error: failed.message }
	}

	if (loaded?.blobId === blobId && loaded.refreshKey === refreshKey) {
		return { status: "ready", ocr: loaded.ocr }
	}

	return { status: "loading" }
}
