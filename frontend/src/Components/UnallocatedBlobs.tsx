import { IconDefinition } from "@fortawesome/free-solid-svg-icons"
import { DropdownButton } from "./DropdownButton"
import { Preview, DimensionEnum } from "./Preview"
import { UnallocatedBlob } from "../Utils/useUnallocatedBlobsPrefetching"
import { formatDate, formatFileSize } from "../Utils/formatUtils"

type UnallocatedBlobItemProps = UnallocatedBlob & {
    setSelectedUnallocated: (blobId: number, added: boolean) => void
    options: { name: string, callback: (id?: number) => void, icon: IconDefinition }[]
    showActions?: boolean
    isSelected?: boolean
}

export const UnallocatedBlobItem = ({ id, fileName, fileSize, uploadedAt, uploadedByUser, options, isSelected, pageCount, showActions, setSelectedUnallocated, }: UnallocatedBlobItemProps) => {
    const uploadedAtDate = new Date(uploadedAt)

    return (
        <div style={{
            minHeight: "100px",
            width: "95%",
            margin: "5px",
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.1), 1px 2px 2px rgba(0, 0, 0, 0.1)",
            borderRadius: "5px",
            border: "1px solid lightgray"
        }}
            className="grid">
            <div style={{ gridArea: "image", background: "#f5f5f5" }}>
                <Preview
                    blobId={id!}
                    numberOfPages={pageCount}
                    showActions={showActions}
                    showPageNavigationOnMinimized={false}
                    maximizedDimension={DimensionEnum.large}
                    minimizedDimension={DimensionEnum.xsmall}
                    onRemove={() => { }}>
                </Preview>
            </div>
            <div style={{ display: "flex", margin: "5px", gridArea: "information" }}>
                <div style={{ marginLeft: "5px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>{fileName}</div>
                    <div style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "5px", width: "100%" }}>
                        <div>{formatDate(uploadedAtDate)}</div>
                        <div>{uploadedByUser}</div>
                        <div >{formatFileSize(fileSize)}</div>
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gridArea: "actions", padding: "10px" }}>
                {
                    isSelected !== undefined &&
                    <input className="input" type="checkbox"
                        style={{ alignSelf: "end" }}
                        checked={isSelected}
                        onChange={(e) => setSelectedUnallocated(id!, e.currentTarget.checked)}
                    />
                }

                <div style={{ display: "flex", alignSelf: "end" }}>
                    <DropdownButton id={id} options={options}></DropdownButton>
                </div>

            </div>
        </div>
    )
}