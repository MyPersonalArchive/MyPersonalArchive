import { faSquareCaretLeft, faSquareCaretRight } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"

type PreviewProps = {
    blobId: number
}
export const Preview = ({ blobId }: PreviewProps) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const [pageNumber, setPageNumber] = useState<number>(1)
    const apiClient = useApiClient()

    useEffect(() => {
        if (imgRef.current !== null) {
            apiClient.getBlob("/api/blob/Preview", { blobId, dimensions: 1, pageNumber })
                .then(blob => {
                    const url = URL.createObjectURL(blob)
                    imgRef.current!.src = url
                })
        }
    }, [pageNumber])

    const showPreviousPage = () => {
        setPageNumber(pageNumber - 1)
    }

    const showNextPage = () => {
        setPageNumber(pageNumber + 1)
    }

    return <>
        <div className="preview">
            <button
                className="previous"
                type="button"
                disabled={pageNumber == 1}
                onClick={() => showPreviousPage()}
            >
                <FontAwesomeIcon icon={faSquareCaretLeft} size="2x" />
            </button>
            <img
                ref={imgRef}
                alt="Preview image"
            />
            <button
                className="next"
                type="button"
                onClick={() => showNextPage()}
            >
                <FontAwesomeIcon icon={faSquareCaretRight} size="2x" />
            </button>
        </div>
    </>
}