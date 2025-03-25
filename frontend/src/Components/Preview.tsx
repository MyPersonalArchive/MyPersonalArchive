import { faSquareCaretLeft, faSquareCaretRight, faDownLeftAndUpRightToCenter, faSpinner } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import React, { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { faSave, faTrashAlt } from "@fortawesome/free-regular-svg-icons"


 export enum DimensionEnum {
    xsmall = 1,
    small = 2,
    medium = 3,
    large = 4
}

type PreviewProps = {
    blobId: number
    numberOfPages?: number
    showPageNavigationOnMinimized?: boolean
    showActions?: boolean
    maximizedDimension: DimensionEnum
    minimizedDimension: DimensionEnum
    onRemove(blobId: number): void
}
export const Preview = ({ blobId, numberOfPages, maximizedDimension, minimizedDimension, showPageNavigationOnMinimized, showActions = true, onRemove }: PreviewProps) => {
    const apiClient = useApiClient()
    const [pageNumber, setPageNumber] = useState<number>(1)
    const [isMaximized, setIsMaximized] = useState<boolean>(false)

    const downloadBlob = () => {
        apiClient.getBlob("/api/blob/Download", { blobId })
            .then(blob => {
                const url = URL.createObjectURL(blob.blob)
                const link = document.createElement("a")
                link.href = url
                link.download = blob.filename
                link.click()
            })
    }

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
        : (
            <div>
                {
                    showActions && 
                        <div style={{textAlign: "center"}}>
                            <button
                                type="button"
                                onClick={() => onRemove(blobId)}
                            >                
                                <FontAwesomeIcon icon={faTrashAlt} size="1x" />
                            </button>
                            <button
                                type="button"
                                onClick={() => downloadBlob()}
                            >                
                                <FontAwesomeIcon icon={faSave} size="1x" />
                            </button>
                            
                        </div>
                }
                <div onClick={() => setIsMaximized(true)}>
                    <InlinePreview
                        blobId={blobId}
                        pageNumber={pageNumber}
                        showPageNavigationOnMinimized={showPageNavigationOnMinimized}
                        setPageNumber={setPageNumber}
                        numberOfPages={numberOfPages ?? 1}
                        dimension={minimizedDimension}>
                    </InlinePreview>
                </div>
            </div>
        )
}




const usePreview = (blobId: number, pageNumber: number, setPageNumber: (x: number) => void, setIsLoading: (x: boolean) => void, dimension: DimensionEnum, imgRef: React.RefObject<HTMLImageElement>) => {
    const apiClient = useApiClient()

    useEffect(() => {
        if (imgRef.current !== null) {
            apiClient.getBlob("/api/blob/Preview", { blobId, dimension, pageNumber: pageNumber - 1})
                .then(blob => {
                    const url = URL.createObjectURL(blob.blob)
                    imgRef.current!.src = url
                    setIsLoading(false)
                })
        }
    }, [pageNumber])

    const showPreviousPage = (event: any) => {
        event.preventDefault()
        setPageNumber(pageNumber - 1)
    }

    const showNextPage = (event: any) => {
        event.preventDefault()
        setPageNumber(pageNumber + 1)
    }

    return { pageNumber, showPreviousPage, showNextPage }
}


type InlinePreviewProps = {
    blobId: number
    pageNumber: number
    setPageNumber: (x: number) => void
    numberOfPages: number
    showPageNavigationOnMinimized?: boolean
    dimension: DimensionEnum
    children?: React.ReactNode
}
const InlinePreview = ({ blobId, pageNumber, setPageNumber, numberOfPages, dimension, showPageNavigationOnMinimized = true, children }: InlinePreviewProps) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { showPreviousPage, showNextPage } = usePreview(blobId, pageNumber, setPageNumber, setIsLoading, dimension, imgRef)

    return <>
        <div className="preview">
            {
                (showPageNavigationOnMinimized && pageNumber > 1) && <button
                    className="previous"
                    type="button"
                    disabled={pageNumber == 1}
                    onClick={(event) => showPreviousPage(event)}
                >
                    <FontAwesomeIcon icon={faSquareCaretLeft} size="2x" />
                </button>
            }
            {
                isLoading 
                    &&  ( <div style={{
                            display: "flex", 
                            justifyContent: "center", 
                            alignItems: "center", 
                            height: "90px",
                            textAlign: "center"
                            }}>
                                <FontAwesomeIcon icon={faSpinner} size="2x" className="fa-spin"/> 
                        </div>)
            }
            <img ref={imgRef} alt="Preview image" style={{ visibility: isLoading ? "hidden" : "visible", height: isLoading ? "0px" : "auto" }}/>
            
            {
                (showPageNavigationOnMinimized && pageNumber < numberOfPages) && <button
                    className="next"
                    type="button"
                    onClick={(event) => showNextPage(event)}
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
