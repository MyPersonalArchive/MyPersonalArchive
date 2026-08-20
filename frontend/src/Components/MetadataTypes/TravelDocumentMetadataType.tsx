import { useRef, useState } from "react"
import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"
import { changeAtIndex, removeAtIndex } from "../../Utils/array-helpers"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"

type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "SET_NOTES", notes: string }
	| { action: "ADD_LEG", leg: Leg }
	| { action: "UPDATE_LEG", index: number, leg: Leg }
	| { action: "REMOVE_LEG", index: number }

type State = {
	notes: string,
	legs: Leg[]
}

type Leg = {
	bookingRef: string,
	flightNumber: string,
	departureFrom: string,
	arrivalAt: string,
}

const reducer = (state: State, command: Command): State => {
	switch (command.action) {
		case "INIT":
			return {
				notes: "",
				legs: []
			}

		case "METADATA_LOADED":
			return {
				...state,
				...command.metadata
			}

		case "SET_NOTES":
			return {
				...state,
				notes: command.notes
			}

		case "ADD_LEG":
			return {
				...state,
				legs: [...state.legs, command.leg]
			}

		case "UPDATE_LEG":
			return {
				...state,
				legs: changeAtIndex(state.legs, command.index, command.leg)
			}

		case "REMOVE_LEG":
			return {
				...state,
				legs: removeAtIndex(state.legs, command.index)
			}

		default:
			return state
	}
}

const Component = (props: MetadataComponentProps) => {
	const state = props.state as State
	const dispatch = props.dispatch as React.Dispatch<Command>

	const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null)

	return (<>

		<table className="table table-compact w-full my-2">
			<thead>
				<tr>
					<th className="">#</th>
					<th className="">Flight</th>
					<th className="">Departure from</th>
					<th className="">Arrival at</th>
					<th className="">Reference #</th>
					<th className=""></th>
				</tr>
			</thead>
			<tbody>
				{state.legs.map((leg, index) => (
					<Row key={index}
						leg={leg}
						index={index}
						dispatch={dispatch}
						isEditing={editingRowIndex === index}
						setIsEditing={() => setEditingRowIndex(index)}
						endIsEditing={() => setEditingRowIndex(null)}
					/>
				))}
				<NewRow
					dispatch={dispatch}
					isEditing={editingRowIndex === state.legs.length}
					setIsEditing={() => setEditingRowIndex(state.legs.length)}
					endIsEditing={() => setEditingRowIndex(null)}
				/>
			</tbody>

		</table>

		<textarea
			rows={4}
			value={state.notes} onChange={e => dispatch({ action: "SET_NOTES", notes: e.target.value })}
			className="input w-full my-2"
			placeholder="Write your notes here..."
		>
		</textarea>
	</>)
}


type RowProps = {
	leg: Leg,
	index: number,
	dispatch: React.Dispatch<Command>,
	isEditing: boolean,
	setIsEditing: () => void
	endIsEditing: () => void
}
const Row = ({ leg, index, dispatch, isEditing, setIsEditing, endIsEditing }: RowProps) => {
	const firstInputRef = useRef<HTMLInputElement>(null)

	const [bookingRef, setBookingRef] = useState(leg.bookingRef)
	const [flightNo, setFlightNo] = useState(leg.flightNumber)
	const [departureFrom, setDepartureFrom] = useState(leg.departureFrom)
	const [arrivalAt, setArrivalAt] = useState(leg.arrivalAt)

	const removeLeg = () => {
		dispatch({ action: "REMOVE_LEG", index })
		endIsEditing()
	}

	const updateLeg = () => {
		dispatch({
			action: "UPDATE_LEG",
			index: index,
			leg: { bookingRef, flightNumber: flightNo, departureFrom, arrivalAt }
		})
		endIsEditing()
	}

	const cancelEditing = () => {
		setBookingRef(leg.bookingRef)
		setFlightNo(leg.flightNumber)
		setDepartureFrom(leg.departureFrom)
		setArrivalAt(leg.arrivalAt)

		endIsEditing()
	}

	return (
		isEditing
			? <tr className="group">
				<td>{index + 1}</td>
				<td>
					<input type="text" className="input w-full" value={flightNo} onChange={e => setFlightNo(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={departureFrom} onChange={e => setDepartureFrom(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={arrivalAt} onChange={e => setArrivalAt(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={bookingRef} onChange={e => setBookingRef(e.target.value)} ref={firstInputRef} />
				</td>
				<td className="flex justify-end gap-2">
					<button type="button" className="btn btn-primary" onClick={() => { updateLeg() }}>
						Save
					</button>
					<button type="button" className="btn" onClick={() => { cancelEditing() }}>
						Revert
					</button>
					<button type="button" className="text-red-500" onClick={() => { removeLeg() }}>
						<FontAwesomeIcon icon={faTrash} />
					</button>

				</td>
			</tr>
			: <tr className="group">
				<td onClick={setIsEditing}>{index + 1}</td>
				<td onClick={setIsEditing}>{flightNo}</td>
				<td onClick={setIsEditing}>{departureFrom}</td>
				<td onClick={setIsEditing}>{arrivalAt}</td>
				<td onClick={setIsEditing}>{bookingRef}</td>
				<td className="flex justify-end gap-2">
					<button type="button" className="text-gray-400 group-hover:text-red-500" onClick={() => {
						dispatch({ action: "REMOVE_LEG", index })
					}}>
						<FontAwesomeIcon icon={faTrash} />
					</button>
				</td>
			</tr>)
}


type NewRowProps = {
	dispatch: React.Dispatch<Command>,
	isEditing: boolean,
	setIsEditing: (index?: number) => void
	endIsEditing: () => void
}
const NewRow = ({ dispatch, isEditing, setIsEditing, endIsEditing }: NewRowProps) => {
	const [bookingRef, setBookingRef] = useState("")
	const [flightNo, setFlightNo] = useState("")
	const [departureFrom, setDepartureFrom] = useState("")
	const [arrivalAt, setArrivalAt] = useState("")

	const addLeg = () => {
		dispatch({ action: "ADD_LEG", leg: { bookingRef, flightNumber: flightNo, departureFrom, arrivalAt } })

		setBookingRef("")
		setFlightNo("")
		setDepartureFrom("")
		setArrivalAt("")

		endIsEditing()
	}

	const cancelEditing = () => {
		setBookingRef("")
		setFlightNo("")
		setDepartureFrom("")
		setArrivalAt("")

		endIsEditing()
	}

	return (
		isEditing
			? <tr className="group">
				<td></td>
				<td>
					<input type="text" className="input w-full" value={flightNo} onChange={e => setFlightNo(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={departureFrom} onChange={e => setDepartureFrom(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={arrivalAt} onChange={e => setArrivalAt(e.target.value)} />
				</td>
				<td>
					<input type="text" className="input w-full" value={bookingRef} onChange={e => setBookingRef(e.target.value)} />
				</td>
				<td className="flex justify-end gap-2">
					<button type="button" className="btn btn-primary" onClick={addLeg}>Save</button>
					<button type="button" className="text-gray-400 group-hover:text-red-500" onClick={cancelEditing}>
						<FontAwesomeIcon icon={faTrash} />
					</button>
				</td>
			</tr>
			: <tr>
				<td colSpan={6}>
					<button type="button" className="w-full" onClick={() => setIsEditing()}>
						<FontAwesomeIcon icon={faPlus} />
					</button>
				</td>
			</tr>
	)
}


export default {
	displayName: "Travel Document",
	path: "travel-document",
	component: Component,
	reducer
} as MetadataType