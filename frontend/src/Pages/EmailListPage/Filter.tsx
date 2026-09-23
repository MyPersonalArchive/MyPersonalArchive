import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { createQueryString } from "../../Utils/createQueryString"


export const Filter = () => {
	const [hideAllocatedEmails, setHideAllocatedEmails] = useState<boolean>(false)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setHideAllocatedEmails((searchParams.get("hideAllocatedEmails") ?? "true") === "true")
	}, [searchParams])

	useEffect(() => {
		navigate({
			search: createQueryString({ hideAllocatedEmails }, { skipEmptyStrings: true })
		})
	}, [hideAllocatedEmails])

	return (
		<label className="whitespace-nowrap">
			<input
				type="checkbox"
				className="checkbox mx-2 sm:ml-0"
				checked={hideAllocatedEmails}
				onChange={() => setHideAllocatedEmails(b => !b)}
			/>
				Hide allocated emails
		</label>
	)
}
