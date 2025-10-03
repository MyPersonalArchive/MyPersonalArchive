import { useState } from "react"

type DatePickerProps = {
	date: string,
	setDate: (date: string) => void
}

export const DatePicker = ({ date, setDate }: DatePickerProps) => {
	const [clickedNoDate, setClickedNoDate] = useState(false)

	return (
		<>
			<div className="group">
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
				<button className="btn" type="button" onClick={() => setClickedNoDate(false)}>&times;</button>
			</div>
			{/* <span className="group">
				<button className="btn" type="button">First</button>
				<button className="btn" type="button">Second</button>
				<button className="btn" type="button">Third</button>
			</span>

			<span className="group">
				<input type="text" className="input" placeholder="First" />
				<button className="btn" type="button">Last</button>
			</span> */}

		</>
	)
}