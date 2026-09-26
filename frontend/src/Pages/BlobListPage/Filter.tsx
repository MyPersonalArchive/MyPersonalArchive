import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createQueryString } from "../../Utils/createQueryString"


export const Filter = () => {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const hideAllocatedParam = searchParams.get("hideAllocatedBlobs")
	const hideAllocatedBlobs = (hideAllocatedParam ?? "true") === "true"

	const setHideAllocatedBlobs = (value: boolean, replace = false) =>
		navigate({ search: createQueryString({ hideAllocatedBlobs: value }, { skipEmptyStrings: true }) }, { replace })

	useEffect(() => {
		// The list page filters on the URL param, so write the default into the URL when missing
		if (hideAllocatedParam === null) {
			setHideAllocatedBlobs(true, true)
		}
	}, [hideAllocatedParam])

	return (
		<label className="whitespace-nowrap">
			<input
				type="checkbox"
				className="checkbox mx-2 sm:ml-0"
				checked={hideAllocatedBlobs}
				onChange={() => setHideAllocatedBlobs(!hideAllocatedBlobs)}
			/>
				Hide allocated blobs
		</label>
	)
}
