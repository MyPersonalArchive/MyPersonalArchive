import { useRef } from "react"
import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"
import { changeAtIndex, removeAtIndex } from "../../Utils/array-helpers"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"

type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "SET_NOTES", notes: string }
	| { action: "ADD_LEG", leg: Leg }
	| { action: "UPDATE_LEG_BOOKINGREF", index: number, bookingRef: string }
	| { action: "UPDATE_LEG_ROUTENUMBER", index: number, routeNumber: string }
	| { action: "UPDATE_LEG_DEPARTUREFROM", index: number, departureFrom: string }
	| { action: "UPDATE_LEG_ARRIVALAT", index: number, arrivalAt: string }
	| { action: "REMOVE_LEG", index: number }

type State = {
	legs: Leg[]
}

type Leg = {
	bookingRef: string,
	routeNumber: string,
	departureFrom: string,
	arrivalAt: string,
}

const reducer = (state: State, command: Command): State => {
	switch (command.action) {
		case "INIT":
			return {
				legs: []
			}

		case "METADATA_LOADED":
			return {
				...state,
				...command.metadata
			}

		case "ADD_LEG":
			return {
				...state,
				legs: [...state.legs, command.leg]
			}

		case "UPDATE_LEG_BOOKINGREF":
			return {
				...state,
				legs: changeAtIndex(state.legs, command.index, { ...state.legs[command.index], bookingRef: command.bookingRef })
			}

		case "UPDATE_LEG_ROUTENUMBER":
			return {
				...state,
				legs: changeAtIndex(state.legs, command.index, { ...state.legs[command.index], routeNumber: command.routeNumber })
			}

		case "UPDATE_LEG_DEPARTUREFROM":
			return {
				...state,
				legs: changeAtIndex(state.legs, command.index, { ...state.legs[command.index], departureFrom: command.departureFrom })
			}

		case "UPDATE_LEG_ARRIVALAT":
			return {
				...state,
				legs: changeAtIndex(state.legs, command.index, { ...state.legs[command.index], arrivalAt: command.arrivalAt })
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

	const areThereEmptyLegs = state.legs.some(leg => !leg.bookingRef && !leg.routeNumber && !leg.departureFrom && !leg.arrivalAt)
	const isLastLegEmpty = state.legs.length > 0 && !state.legs.at(-1)?.bookingRef && !state.legs.at(-1)?.routeNumber && !state.legs.at(-1)?.departureFrom && !state.legs.at(-1)?.arrivalAt

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
					/>
				))}
				{!isLastLegEmpty &&
					<tr className="h-12.75">
						<td colSpan={6}>
							<button type="button" className="w-full" onClick={() => dispatch({ action: "ADD_LEG", leg: { bookingRef: "", routeNumber: "", departureFrom: "", arrivalAt: "" } })}>
								<FontAwesomeIcon icon={faPlus} />
							</button>
						</td>
					</tr>
				}
			</tbody>

		</table>
	</>)
}


type RowProps = {
	leg: Leg,
	index: number,
	dispatch: React.Dispatch<Command>,
}
const Row = ({ leg, index, dispatch }: RowProps) => {
	const firstInputRef = useRef<HTMLInputElement>(null)

	return (
		<tr className="group">
			<td>{index + 1}</td>
			<td>
				<input type="text" className="input" value={leg.routeNumber} onChange={e => dispatch({ action: "UPDATE_LEG_ROUTENUMBER", index, routeNumber: e.target.value })} />
			</td>
			<td>
				<input type="text" className="input" value={leg.departureFrom} onChange={e => dispatch({ action: "UPDATE_LEG_DEPARTUREFROM", index, departureFrom: e.target.value })} />
			</td>
			<td>
				<input type="text" className="input" value={leg.arrivalAt} onChange={e => dispatch({ action: "UPDATE_LEG_ARRIVALAT", index, arrivalAt: e.target.value })} />
			</td>
			<td>
				<input type="text" className="input" value={leg.bookingRef} onChange={e => dispatch({ action: "UPDATE_LEG_BOOKINGREF", index, bookingRef: e.target.value })} ref={firstInputRef} />
			</td>
			<td>
				<button type="button" className="text-gray-400 group-hover:text-red-500" onClick={() => { dispatch({ action: "REMOVE_LEG", index }) }}>
					<FontAwesomeIcon icon={faTrash} />
				</button>
			</td>
		</tr>)
}


export default {
	displayName: "Travel Document",
	path: "travel-document",
	component: Component,
	reducer
} as MetadataType