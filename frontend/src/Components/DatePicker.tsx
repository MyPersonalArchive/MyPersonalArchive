
type DatePickerProps = {
	date: string,
	setDate: (date: string) => void
}

export const DatePicker = ({ date, setDate }: DatePickerProps) => {
	return (
		<>
			<div className="grouped">
				{
					<input type="date" className="input"
						value={date ?? ""}
						onChange={e => setDate(e.target.value)}
					/>
				}
				<button className="btn" type="button" onClick={() => setDate("")}>&times;</button>
			</div>
		</>
	)
}