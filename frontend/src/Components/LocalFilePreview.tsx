import { faUpRightAndDownLeftFromCenter, faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"

type PreviewProps = {
    fileName: string,
    blob: Blob,
    removeBlob: (fileName: string) => void
}

export const LocalFilePreview = ({fileName, blob, removeBlob}: PreviewProps) => {
    const [expand, setExpand] = useState(false)
    const [fileData, setFileData] = useState("")

    useEffect(() => {
        blobToBase64(blob).then(data => {
            setFileData(data as string)
        })
    }, [blob])

    const blobToBase64 = async (blob: Blob) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
    
            reader.onloadend = () => {
                const base64String = reader.result?.toString()!
                resolve(base64String)
            }
            reader.readAsDataURL(blob)
        })
    }

    return (
        <div>
            <div style={{
                width: "106px",
                height: "150px",
                // overflowY: "auto",
                // overflowX: "auto",
                resize: "both",
                position: "relative",
                zIndex: "2",
            }} className="preview">
                <iframe 
                        src={fileData}
                        style={{
                            width: "100%",
                            border: "none",
                            overflow: "hidden"
                            }}></iframe>

                    <button className="button"
                        style={{
                            top: "0",
                            left: "0"
                        }}
                        type="button"
                        onClick={() => removeBlob(fileName)}
                    >                
                        <FontAwesomeIcon icon={faTrash} size="1x" />
                    </button>
                    <button className="button"
                        style={{
                            top: "0",
                            right: "0"
                        }}
                        type="button"
                        onClick={() => setExpand(true)}
                    >                
                        <FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
                    </button>
                    
            </div>

            {expand ? (
                <div style={{
                    position: "absolute", 
                    width: "95%", 
                    height: "90%", 
                    margin: "20px",
                    backgroundColor: "whitesmoke", 
                    boxShadow: "0 0 3px #ccc",
                    top: 0,
                    left: 0
                    }}>
                        <div style={{textAlign: "center"}}>{fileName}</div>
                    <div style={{display: "flex", justifyContent: "flex-end", margin: "10px"}}>
                        <button className="button" onClick={() => setExpand(false)}>&time;</button>
                    </div>
                    <div style={{
                        width: "100%",
                        height: "100%",
                        resize: "both",
                        position: "relative",
                        zIndex: "99",
                    }}>
                        <iframe
                                src={fileData}
                                style={{
                                    width: "100%",
                                    height: "99%",
                                    border: "none",
                        }}></iframe>
                    </div>
                </div>
            ) : null}
            
        </div>
    )
}