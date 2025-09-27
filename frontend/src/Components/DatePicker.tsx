import { useState } from "react"

type DatePickerProps = {
	date: string,
	setDate: (date: string) => void
}

export const DatePicker = ({ date, setDate }: DatePickerProps) => {
	const [clickedNoDate, setClickedNoDate] = useState(false)

	return (
		<>
			<div>
				{
					(date || clickedNoDate) ? (
						<input type="date" className="input"
							value={date ? new Date(date).toISOString().split("T")[0] : ""}
							onChange={e => setDate(e.target.value)}
						/>
					) : (
						<span className="input" onClick={() => setClickedNoDate(true)}>
							Not date set
						</span>
					)
				}
				<button className="btn" onClick={() => setClickedNoDate(false)}>&times;</button>
			</div>
		</>
	)
}