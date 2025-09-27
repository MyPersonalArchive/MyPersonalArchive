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
							// style={{
							// 	border: "1px solid #ccc",
							// 	borderRadius: "4px",
							// 	padding: "4px",
							// 	width: "220px"
							// }}
						/>
					) : (
						<span className="input" onClick={() => setClickedNoDate(true)}
							// style={{
							// 	border: "1px solid #ccc",
							// 	borderRadius: "4px",
							// 	padding: "4px",
							// 	width: "220px"
							// }}
						>
							Not date set
						</span>
					)
				}
				<button className="btn" onClick={() => setClickedNoDate(false)}>&times;</button>
			</div>
		</>
	)
}