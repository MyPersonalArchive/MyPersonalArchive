import { useRef } from "react"
import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"
import { changeAtIndex, moveInArray, removeAtIndex } from "../../Utils/array-helpers"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGripVertical, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import { isDragging, MimeTypeConverterArray, useDrop, useSortableDragDrop } from "../DragDropHelpers"

type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "SET_NOTES", notes: string }
	| { action: "ADD_LEG", leg: Leg }
	| { action: "MOVE_LEG", fromIndex: number, toIndex: number }
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

		case "MOVE_LEG":
			return {
				...state,
				legs: moveInArray(state.legs, command.fromIndex, command.toIndex)
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


export const travelDocumentLegMimeTypeConverters: MimeTypeConverterArray<Leg, number> = [
	{
		mimeType: "application/travel-document-leg-index+json",
		convertDragDataToPayload: (_, index) => ({ index }),
		convertDropPayloadToAction: (fromIndex, toIndex, _) => ({ action: "MOVE_LEG", fromIndex, toIndex })
	},
	{
		mimeType: "application/travel-document-leg-definition+json",
		convertDragDataToPayload: (leg, _) => (leg),
		convertDropPayloadToAction: (_1, _2, leg) => ({ action: "ADD_LEG", leg })
	},
	{
		mimeType: "text",
		convertDragDataToPayload: (leg, _) => `${leg.bookingRef} (${leg.routeNumber} from ${leg.departureFrom} to ${leg.arrivalAt})`,
	}
]


const Component = (props: MetadataComponentProps) => {
	const state = props.state as State
	const dispatch = props.dispatch as React.Dispatch<Command>

	const dnd = useSortableDragDrop<Leg, HTMLDivElement>(
		".draghandle",
		travelDocumentLegMimeTypeConverters,
		state.legs,
		dispatch
	)

	const dropToCopy = useDrop<Leg, number>(
		travelDocumentLegMimeTypeConverters.filter(converter => converter.mimeType === "application/travel-document-leg-definition+json"),
		dispatch
	)


	// const areThereEmptyLegs = state.legs.some(leg => !leg.bookingRef && !leg.routeNumber && !leg.departureFrom && !leg.arrivalAt)
	const isLastLegEmpty = state.legs?.length > 0 && !state.legs.at(-1)?.bookingRef && !state.legs.at(-1)?.routeNumber && !state.legs.at(-1)?.departureFrom && !state.legs.at(-1)?.arrivalAt

	return (<>
		<div className="flex flex-row flex-wrap gap-4">
			{dnd.rows.map(({ rowType, data: leg }, index) => rowType === "item-row"
				? <div key={index}
					className="card w-71 h-42 cursor-default group grid grid-cols-2 p-2 has-[.delete-leg:hover]:bg-red-100!"
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, leg)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<div className="col-span-2 flex flex-row gap-2">
						<span className="draghandle cursor-grab grip-background flex-1 h-6">
							{/* <FontAwesomeIcon icon={faGripVertical} fixedWidth /> */}
						</span>
						<div className="stack-horizontal to-the-right">
							<button type="button" className="text-gray-400 group-hover:text-red-500 delete-leg" onClick={() => { dispatch({ action: "REMOVE_LEG", index }) }}>
								<FontAwesomeIcon icon={faTrash} />
							</button>
						</div>
					</div>

					<div>
						<span className="text-gray-400 text-xs">Route #</span>
						<input type="text" className="input w-25" value={leg.routeNumber} onChange={e => dispatch({ action: "UPDATE_LEG_ROUTENUMBER", index, routeNumber: e.target.value })} />
					</div>
					<div>
						<span className="text-gray-400 text-xs">Booking ref</span>
						<input type="text" className="input w-25" value={leg.bookingRef} onChange={e => dispatch({ action: "UPDATE_LEG_BOOKINGREF", index, bookingRef: e.target.value })} />
					</div>

					<label className="text-gray-400 text-xs">Departure from</label>
					<label className="text-gray-400 text-xs">Arrival at</label>

					<div className="grouped col-span-2">
						<input type="text" className="input w-33" value={leg.departureFrom} onChange={e => dispatch({ action: "UPDATE_LEG_DEPARTUREFROM", index, departureFrom: e.target.value })} />
						<input type="text" className="input w-33" value={leg.arrivalAt} onChange={e => dispatch({ action: "UPDATE_LEG_ARRIVALAT", index, arrivalAt: e.target.value })} />
					</div>
				</div>
				: // row.rowType === "drop-row"
				<div key={index}
					className="striped-background"
					style={{ width: dnd.draggedRect?.width, height: dnd.draggedRect?.height }}
					onDragEnd={dnd.dragEnd}
					onDragOver={e => e.preventDefault()}
					onDrop={dnd.handleDrop(index)}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
				</div>
			)}
			{(!isLastLegEmpty || isDragging(dnd.dragStatus)) &&
				<button type="button"
					className="card w-71 h-42"
					onDragOver={dropToCopy.dragOver(undefined as unknown as number)}
					onDrop={dropToCopy.handleDrop(undefined as unknown as number)}
					onClick={() => dispatch({ action: "ADD_LEG", leg: { bookingRef: "", routeNumber: "", departureFrom: "", arrivalAt: "" } })}
				>
					<div className="flex flex-col items-center justify-center">
						<div className="text-7xl">
							<FontAwesomeIcon icon={faPlus} />
						</div>
						<div className="text-sm">Invite user</div>
					</div>
				</button>
			}
		</div>
	</>)
}


export default {
	displayName: "Travel Document",
	path: "travel-document",
	component: Component,
	reducer
} as MetadataType