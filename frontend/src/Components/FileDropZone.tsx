import { faFileArrowUp } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRef } from "react"

type FileDropZoneProps = {
    setFileBlobs: ([]: { fileName: string, fileData: Blob }[]) => void
}


export const FileDropZone = ({setFileBlobs: setFileBlobs}: FileDropZoneProps) => {

    const inputFile = useRef<HTMLInputElement | null>(null)

    const handleDrop = (event: any) => {
        event.preventDefault()
        const { files } = event.dataTransfer
        if (files.length > 0) {
            handleFileChange(files)
        }
    }

    const onChangeFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation()
        event.preventDefault()

        const file = event.target.files[0]
        handleFileChange([file])
    }

    const handleFileChange = (files: File[]) => {
        if (!files) {
            return;
        }
    
        const filePromises = [];
    
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader()
    
            const filePromise = new Promise<{ fileName: string, fileData: Blob }>((resolve, reject) => {
                reader.onload = () => {
                    resolve({
                        fileName: files[i].name,
                        fileData: new Blob([files[i]], { type: files[i].type })
                    })
                }
    
                reader.onerror = () => {
                    reject(new Error('Error reading file'));
                }

                reader.readAsDataURL(files[i])
            });
    
            filePromises.push(filePromise)
        }
    
        Promise.all(filePromises)
            .then((fileDataArray) => {
                setFileBlobs(fileDataArray)
            })
            .catch((error) => {
                console.error('Error reading files:', error)
            })
    }

    const handleDragOver = (event: any) => {
        event.preventDefault()

    }

    const handleDragStart = (event: any) => {
        event.dataTransfer.setData("text/plain", event.target.id)
    }

    return (
        <div style={{
            border: "solid 1px",
            borderColor: "lightgray",
            borderRadius: "5px",
            marginBottom: "10px",
            width: "100%"}}>
            <input
                type='file'
                id='file'
                ref={inputFile}
                style={{display: "none"}}
                onChange={onChangeFile}/>
            <div style={{margin: "10px"}}
                draggable = "true"
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}>
                <FontAwesomeIcon icon={faFileArrowUp} color="gray" size="2x" width="100%" style={{marginBottom: "5px"}} />
                <div style={{
                    display: "flex",
                    justifyContent: "center"}}>
                    <div onClick={() => inputFile?.current?.click()} 
                    style={{
                        cursor: "pointer", 
                        textDecoration: "underline", 
                        color: "blue",
                        alignContent: "center"}}>Select file</div>
                    <p style={{
                        textAlign: "center",
                        fontSize: "14px",
                        marginLeft: "5px"}}>
                        or drag and drop a file here</p>
                </div>
            </div>
        </div>
    )
}