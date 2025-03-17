import { faSquareCaretLeft, faSquareCaretRight, faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import React, { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"


 export enum DimensionEnum {
    xsmall = 1,
    small = 2,
    medium = 3,
    large = 4
}

type PreviewProps = {
    blobId: number
    numberOfPages?: number
    showPageNavigationOnMinized?: boolean
    maximizedDimension: DimensionEnum
    minimizedDimension: DimensionEnum
}
export const Preview = ({ blobId, numberOfPages, maximizedDimension, minimizedDimension, showPageNavigationOnMinized }: PreviewProps) => {
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [isMaximized, setIsMaximized] = useState<boolean>(false)

    return isMaximized
        ? <div className="dimmedBackground" onClick={() => setIsMaximized(false)}>
            <div className="overlay" onClick={event => event.stopPropagation()}>
                <InlinePreview
                    blobId={blobId}
                    pageNumber={pageNumber}
                    setPageNumber={setPageNumber}
                    numberOfPages={numberOfPages ?? 1}
                    dimension={maximizedDimension}
                >
                    <button
                        className="minimize"
                        type="button"
                        onClick={() => setIsMaximized(false)}
                    >
                        <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="2x" />
                    </button>
                </InlinePreview>
                {
                    numberOfPages &&
                    numberOfPages > 1 && <div className="pageNumber">
                        {pageNumber} / {numberOfPages}
                    </div>
                }
            </div>
        </div>
        : <InlinePreview
            blobId={blobId}
            pageNumber={pageNumber}
            showPageNavigationOnMinized={showPageNavigationOnMinized}
            setPageNumber={setPageNumber}
            numberOfPages={numberOfPages ?? 1}
            dimension={minimizedDimension}
        >
            <button
                className="maximize"
                type="button"
                onClick={() => setIsMaximized(true)}
            >
                <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
            </button>
        </InlinePreview>
}




const usePreview = (blobId: number, pageNumber: number, setPageNumber: (x: number) => void, dimension: DimensionEnum, imgRef: React.RefObject<HTMLImageElement>) => {
    const apiClient = useApiClient()

    useEffect(() => {
        if (imgRef.current !== null) {
            apiClient.getBlob("/api/blob/Preview", { blobId, dimension, pageNumber: pageNumber - 1})
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

    return { pageNumber, showPreviousPage, showNextPage }
}


type InlinePreviewProps = {
    blobId: number
    pageNumber: number
    setPageNumber: (x: number) => void
    numberOfPages: number
    showPageNavigationOnMinized?: boolean
    dimension: DimensionEnum
    children?: React.ReactNode
}
const InlinePreview = ({ blobId, pageNumber, setPageNumber, numberOfPages, dimension, showPageNavigationOnMinized = true, children }: InlinePreviewProps) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const { showPreviousPage, showNextPage } = usePreview(blobId, pageNumber, setPageNumber, dimension, imgRef)

    return <>
        <div className="preview">
            {
                (showPageNavigationOnMinized && pageNumber > 1) && <button
                    className="previous"
                    type="button"
                    disabled={pageNumber == 1}
                    onClick={() => showPreviousPage()}
                >
                    <FontAwesomeIcon icon={faSquareCaretLeft} size="2x" />
                </button>
            }
            <img
                ref={imgRef}
                alt="Preview image"
            />
            {
                (showPageNavigationOnMinized && pageNumber < numberOfPages) && <button
                    className="next"
                    type="button"
                    onClick={() => showNextPage()}
                >
                    <FontAwesomeIcon icon={faSquareCaretRight} size="2x" />
                </button>
            }
            {
                children
            }
        </div>
    </>
}
