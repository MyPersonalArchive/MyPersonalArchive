import { faSquareCaretLeft, faSquareCaretRight, faDownLeftAndUpRightToCenter, faUpRightAndDownLeftFromCenter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import React, { useEffect, useRef, useState } from "react"
import { useApiClient } from "../Utils/useApiClient"
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash"
import classNames from "classnames"


export enum DimensionEnum {
    xsmall = 1,
    small = 2,
    medium = 3,
    large = 4
}

type Blob = {
    id: number
    numberOfPages?: number
}


type PreviewListProps<T extends Blob> = {
    blobs: T[]
    containerStyle?: React.CSSProperties
    containerClassName?: string
    thumbnailPreviewTemplate: (blob: T, setMaximizeBlob: (blob?: T) => void) => React.ReactNode
    maximizedPreviewTemplate: (blob: T, minimize: () => void) => React.ReactNode
}
export const PreviewList = <T extends Blob,>({ blobs, containerStyle, containerClassName, thumbnailPreviewTemplate, maximizedPreviewTemplate }: PreviewListProps<T>) => {
    const [maximizedBlob, setMaximizedBlob] = useState<T | undefined>()

    return (
        <>
            <div className={classNames("previewlist ", containerClassName)} style={containerStyle}>
                {
                    blobs.map(blob => thumbnailPreviewTemplate(blob, setMaximizedBlob))
                }
            </div>
            {
                maximizedBlob !== undefined && <>
                    <div className="dimmedBackground" onClick={() => setMaximizedBlob(undefined)}>
                        <div onClick={event => event.stopPropagation()}>
                            {
                                maximizedPreviewTemplate(maximizedBlob, () => setMaximizedBlob(undefined))
                            }
                        </div>
                    </div>
                </>
            }
        </>
    )
}


type PreviewProps<T extends Blob> = {
    blob: T
    numberOfPages?: number
    showPageNavigation?: boolean
    dimension: DimensionEnum
    onMaximize?: (blob: T) => void
    onMinimize?: () => void
    onRemove?: (blob: T) => void
}
export const Preview = <T extends Blob,>({ blob, dimension, showPageNavigation, onMaximize, onMinimize, onRemove }: PreviewProps<T>) => {
    const [pageNumber, setPageNumber] = useState<number>(1)

    return (
        <>
            <InlinePreview
                blobId={blob.id}
                pageNumber={pageNumber}
                showPageNavigation={showPageNavigation}
                setPageNumber={setPageNumber}
                numberOfPages={blob.numberOfPages ?? 1}
                dimension={dimension}
            >
                {
                    onMaximize &&
                    <button className="maximize" type="button" onClick={() => onMaximize!(blob)}>
                        <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
                    </button>
                }
                {
                    onMinimize &&
                    <button className="minimize" type="button" onClick={() => onMinimize!()}>
                        <FontAwesomeIcon icon={faDownLeftAndUpRightToCenter} size="1x" />
                    </button>
                }
                {
                    onRemove &&
                    <button className="delete" type="button" onClick={() => onRemove!(blob)}>
                        <FontAwesomeIcon icon={faTrash} size="1x" />
                    </button>
                }
            </InlinePreview>
        </>
    )
}


const usePreview = (blobId: number, pageNumber: number, setPageNumber: (x: number) => void, dimension: DimensionEnum, imgRef: React.RefObject<HTMLImageElement>) => {
    const apiClient = useApiClient()

    useEffect(() => {
        if (imgRef.current !== null) {
            apiClient.getBlob("/api/blob/Preview", { blobId, dimension, pageNumber: pageNumber - 1 })
                .then(response => {
                    const url = URL.createObjectURL(response.blob)
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
    showPageNavigation?: boolean
    dimension: DimensionEnum
    children?: React.ReactNode
}
const InlinePreview = ({ blobId, pageNumber, setPageNumber, numberOfPages, dimension, showPageNavigation = true, children }: InlinePreviewProps) => {
    const imgRef = useRef<HTMLImageElement>(null)
    const { showPreviousPage, showNextPage } = usePreview(blobId, pageNumber, setPageNumber, dimension, imgRef)

    return <>
        <div className="preview">
            {
                (showPageNavigation && pageNumber > 1) &&
                <button
                    className="previous"
                    type="button"
                    disabled={pageNumber == 1}
                    onClick={() => showPreviousPage()}
                >
                    <FontAwesomeIcon icon={faSquareCaretLeft} size="2x" />
                </button>
            }
            <img ref={imgRef} alt="Preview image" />
            {
                (showPageNavigation && pageNumber < numberOfPages) &&
                <button
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
