import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createQueryString } from "../../Utils/createQueryString"


export const Filter = () => {
	const [hideAllocatedBlobs, setHideAllocatedBlobs] = useState<boolean>(true)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setHideAllocatedBlobs((searchParams.get("hideAllocatedBlobs") ?? "true") === "true")
	}, [searchParams])

	useEffect(() => {
		navigate({
			search: createQueryString({ hideAllocatedBlobs }, { skipEmptyStrings: true })
		})
	}, [hideAllocatedBlobs])

	return (
		<div>
			<label className="whitespace-nowrap">
				<input
					type="checkbox"
					className="checkbox mr-2"
					checked={hideAllocatedBlobs}
					onChange={() => setHideAllocatedBlobs(b => !b)}
				/>
				Hide allocated blobs
			</label>
		</div>
	)
}
