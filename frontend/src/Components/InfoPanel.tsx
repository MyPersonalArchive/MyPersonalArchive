import { UnallocatedBlob } from "../Utils/Atoms"
import { formatDate, formatFileSize } from "../Utils/formatUtils"

type InfoPanelProps = {
    blob: UnallocatedBlob
}
export const InfoPanel = ({ blob }: InfoPanelProps) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", padding: "5px 10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>{blob.fileName}</div>
            <div style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "5px" }}>
                <div>{formatDate(new Date(blob.uploadedAt))}</div>
                <div>{blob.uploadedByUser}</div>
                <div>{formatFileSize(blob.fileSize)}</div>
            </div>
        </div>
    )
}
