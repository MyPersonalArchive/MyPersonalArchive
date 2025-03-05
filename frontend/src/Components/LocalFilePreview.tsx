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
            console.log(data)
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
            <div style={{display: "flex", justifyContent: "space-between"}}>
                <div style={{alignContent: "center", fontSize: "16px"}}>{fileName}</div>

                <div style={{display: "flex"}}>
                <button onClick={() => setExpand(!expand)}>[ ]</button>
                <button onClick={() => removeBlob(fileName)}>X</button>
                </div>
            </div>

            <div style={{
                width: "250px",
                height: "300px",
                // overflowY: "auto",
                // overflowX: "auto",
                resize: "both",
                position: "relative",
                zIndex: "2",
            }}>
                <iframe
                        src={fileData}
                        style={{
                            width: "100%",
                            height: "99%",
                            border: "none",
                            }}></iframe>
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
                        <button onClick={() => setExpand(false)}>X</button>
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