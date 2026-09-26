import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createQueryString } from "../../Utils/createQueryString"


export const Filter = () => {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const hideAllocatedParam = searchParams.get("hideAllocatedEmails")
	const hideAllocatedEmails = (hideAllocatedParam ?? "true") === "true"

	const setHideAllocatedEmails = (value: boolean, replace = false) =>
		navigate({ search: createQueryString({ hideAllocatedEmails: value }, { skipEmptyStrings: true }) }, { replace })

	useEffect(() => {
		// The list page filters on the URL param, so write the default into the URL when missing
		if (hideAllocatedParam === null) {
			setHideAllocatedEmails(true, true)
		}
	}, [hideAllocatedParam])

	return (
		<label className="whitespace-nowrap">
			<input
				type="checkbox"
				className="checkbox mx-2 sm:ml-0"
				checked={hideAllocatedEmails}
				onChange={() => setHideAllocatedEmails(!hideAllocatedEmails)}
			/>
				Hide allocated emails
		</label>
	)
}
