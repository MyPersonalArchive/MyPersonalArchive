import { IconDefinition} from "@fortawesome/free-solid-svg-icons"
import { DropdownButton } from "./DropdownButton"
import { Preview, DimensionEnum } from "./Preview"
import { UnallocatedBlob } from "../Utils/useUnallocatedBlobsPrefetching"

type UnallocatedBlobItemProps = UnallocatedBlob & {
    setSelectedUnallocated: (blobId: number, added: boolean) => void
    options: {name: string, callback: (id?: number) => void, icon: IconDefinition}[]
    isSelected?: boolean
}

export const UnallocatedBlobItem = ({id, fileName, fileSize, uploadedAt, uploadedByUser, options, isSelected, pageCount, setSelectedUnallocated, }: UnallocatedBlobItemProps) => {
    const uploadedAtDate = new Date(uploadedAt)

    const sizeToHumanReadable = (size: number): string => {
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.floor(Math.log(size) / Math.log(1024));
        const value = size / Math.pow(1024, index);
        return `${value.toFixed(2)} ${units[index]}`;
    }

    const getDateString = (): string => {
        const formattedDate = new Intl.DateTimeFormat('no-NB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }).format(uploadedAtDate);

          return formattedDate
    }

    return (
        <div style={{  
            minHeight: "100px", 
            width: "95%", 
            margin: "5px", 
            boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.1), 1px 2px 2px rgba(0, 0, 0, 0.1)",
            borderRadius: "5px",
            border: "1px solid lightgray" }} 
            className="grid">
            <div style={{gridArea: "image", background: "#f5f5f5"}}>
                <Preview 
                    blobId={id!} 
                    numberOfPages={pageCount} 
                    showPageNavigationOnMinized={false}
                    maximizedDimension={DimensionEnum.large} 
                    minimizedDimension={DimensionEnum.xsmall}>
                </Preview>
            </div>
            <div style={{ display: "flex", margin: "5px", gridArea: "information" }}>
                <div style={{ marginLeft: "5px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold" }}>{fileName}</div>
                    <div style={{ display: "block", fontSize: "12px", color: "gray", marginTop: "5px", width: "100%" }}>
                        <div>{getDateString()}</div>
                        <div>{uploadedByUser}</div>
                        <div >{sizeToHumanReadable(fileSize)}</div>
                    </div>
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gridArea: "actions", padding: "10px" }}>
                    <input 
                    style={{alignSelf: "end"}}
                    type="checkbox" 
                    checked={isSelected}
                    onChange={(e) => setSelectedUnallocated(id!, e.currentTarget.checked)}></input>
                    <div style={{ display: "flex", alignSelf: "end" }}>
                        <DropdownButton id={id} options={options}></DropdownButton>
                    </div>
                    
                </div>
        </div>
    )
}