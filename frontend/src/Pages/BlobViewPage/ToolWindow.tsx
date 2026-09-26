import { useEffect, useRef, useState } from "react"
import { useAtom } from "jotai"
import { useNavigate } from "react-router-dom"
import { FloatingToolWindow } from "../../Components/FloatingToolWindow"
import { BlobMetadata } from "../../Utils/Atoms/blobsAtom"
import { quickRegistrationModeAtom } from "../../Utils/Atoms"
import { useApiClient } from "../../Utils/Hooks/useApiClient"
import { RoutePaths } from "../../RoutePaths"
import { Position } from "../../types/Position"
import { Size } from "../../types/Size"


type Props = {
	blob: BlobMetadata
	canMoveNext: boolean
	moveNext: () => void
	setToolWindowIsOpen?: (isOpen: boolean) => void
	toolWindowPosition: Position
	toolWindowSize: Size
	setToolWindowPosition: (position: Position) => void
	setToolWindowSize: (size: Size) => void
}
export const ToolWindow = ({ blob, canMoveNext, moveNext, setToolWindowIsOpen, toolWindowPosition, toolWindowSize, setToolWindowPosition, setToolWindowSize }: Props) => {
	const [registrationMode, setRegistrationMode] = useAtom(quickRegistrationModeAtom)
	const firstInputRef = useRef<HTMLInputElement>(null)
	const [title, setTitle] = useState<string>()

	const apiClient = useApiClient()
	const navigate = useNavigate()

	useEffect(() => {
		firstInputRef.current?.focus()
	}, [])

	const register = (selectedMetadataType?: string) => {
		switch (registrationMode) {
			case "createAndEdit": {
				const state = {
					blobIds: [blob.id],
					metadataTypes: selectedMetadataType === undefined ? [] : [selectedMetadataType],
					documentDate: blob.uploadedAt.toISOString().split("T")[0]
				}
				navigate(RoutePaths.Archive.New, { state })
				break
			}

			case "createAndMove": {
				const formData = new FormData()
				const metadata = selectedMetadataType === undefined
					? {}
					: { [selectedMetadataType ?? ""]: {} }
				const storeRequest = {
					id: crypto.randomUUID(),
					title: title,
					documentDate: blob.uploadedAt.toISOString().split("T")[0],
					tags: [],
					notes: "",
					metadata,
					existingBlobIds: [blob.id]
				}

				formData.append("rawRequest", JSON.stringify(storeRequest))

				apiClient.putFormData("/api/archive/Store", formData)

				if (canMoveNext) moveNext()
				break
			}
		}
	}

	return (
		<FloatingToolWindow title="Quick create archive item"
			className="flex flex-col gap-2 p-2"
			initialPosition={toolWindowPosition}
			initialSize={toolWindowSize}
			onPositionChange={setToolWindowPosition}
			onSizeChange={setToolWindowSize}
			minWidth={268} minHeight={171}
			onClose={() => { setToolWindowIsOpen?.(false) }}
			closeOnEscape={true}
		>
			<input ref={firstInputRef} type="text" className="input w-full" placeholder="Name of archived item" value={title} onChange={(e) => setTitle(e.target.value)} />
			<div className="flex flex-row gap-2">
				<button className="btn flex-1" onClick={() => register("receipt")}>receipt</button>
				<button className="btn flex-1" onClick={() => register("travel-document")}>travel document</button>
			</div>

			{
				registrationMode === "createAndEdit"
					? <button
						className="btn"
						disabled={!canMoveNext}
						onClick={() => { register("") }}
					>
						Register
					</button>
					: <button
						className="btn"
						onClick={() => { moveNext() }}
					>
						Move to next without registering
					</button>
			}

			<div className="flex-1"></div>
			<label>
				<input type="radio"
					className="mr-2"
					name="navigationMode"
					value="createAndMove"
					checked={registrationMode === "createAndMove"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")}
				/>
				Just create it and move to next
			</label>
			<label>
				<input type="radio"
					className="mr-2"
					name="navigationMode"
					value="createAndEdit"
					checked={registrationMode === "createAndEdit"}
					onChange={(e) => setRegistrationMode(e.target.value as "createAndMove" | "createAndEdit")}
				/>
				Create and enter edit mode
			</label>
		</FloatingToolWindow>
	)
}