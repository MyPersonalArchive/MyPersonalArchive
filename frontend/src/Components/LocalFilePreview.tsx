import { faUpRightAndDownLeftFromCenter, faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"

type PreviewProps = {
	fileName: string,
	blob: Blob,
	removeBlob: (fileName: string) => void
}

export const LocalFilePreview = ({ fileName, blob, removeBlob }: PreviewProps) => {
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

			<div className="preview relative z-[2] resize overflow-auto w-[106px] h-[150px]">
				<iframe src={fileData} className="w-full border-none overflow-hidden"></iframe>

				<button className="button top-0 left-0"
					type="button"
					onClick={() => removeBlob(fileName)}
				>
					<FontAwesomeIcon icon={faTrash} size="1x" />
				</button>
				<button className="button top-0 right-0"
					type="button"
					onClick={() => setExpand(true)}
				>
					<FontAwesomeIcon icon={faUpRightAndDownLeftFromCenter} size="1x" />
				</button>

			</div>

			{expand ? (
				<div className="absolute w-[95%] h-[90%] m-[20px] bg-whitesmoke shadow-lg top-0 left-0">
					<div className="text-center">{fileName}</div>
					<div className="flex justify-end m-[10px]">
						<button className="button" onClick={() => setExpand(false)}>&times;</button>
					</div>
					<div className="w-full h-full resize relative z-[99]">
						<iframe src={fileData} className="w-full h-full border-none"></iframe>
					</div>
				</div>
			) : null}

		</div>
	)
}