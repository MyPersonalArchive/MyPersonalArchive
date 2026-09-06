import React from "react"
import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"
import { changeAtIndex, moveInArray, removeAtIndex } from "../../Utils/array-helpers"
import { MimeTypeConverterArray, useDrop, useSortableDragDrop } from "../DragDropHelpers"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrash, faPlus, faGripVertical } from "@fortawesome/free-solid-svg-icons"

type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "UPDATE_CURRENCY", currency: string }
	| { action: "ADD_RECEIPTLINE", receiptLine: ReceiptLine }
	| { action: "MOVE_RECEIPTLINE", fromIndex: number, toIndex: number }
	| { action: "UPDATE_RECEIPTLINE_DESCRIPTION", index: number, description: string }
	| { action: "UPDATE_RECEIPTLINE_AMOUNT", index: number, amount: string }
	| { action: "UPDATE_RECEIPTLINE_WARRANTY", index: number, warranty: string }
	| { action: "UPDATE_RECEIPTLINE_DISPOSITIONSTATUS", index: number, dispositionStatus: string }
	| { action: "REMOVE_RECEIPTLINE", index: number }


type State = {
	currency: string
	receiptLines: ReceiptLine[]
}

type ReceiptLine = {
	description: string
	amount: string
	warranty: string
	dispositionStatus: string
}


const summarize = (state: State) => {
	const sum = state?.receiptLines?.reduce((acc, line) => acc + parseFloat(line.amount || "0"), 0) || 0
	return sum !== 0 ? `Total ${sum} ${state.currency}` : undefined
}


const reducer = (state: State, command: Command): State => {
	switch (command.action) {
		case "INIT":
			return {
				currency: "",
				receiptLines: []
			}

		case "METADATA_LOADED":
			return {
				...state,
				...command.metadata
			}

		case "UPDATE_CURRENCY":
			return {
				...state,
				currency: command.currency
			}

		case "ADD_RECEIPTLINE":
			return {
				...state,
				receiptLines: [...state.receiptLines, command.receiptLine]
			}

		case "MOVE_RECEIPTLINE":
			return {
				...state,
				receiptLines: moveInArray(state.receiptLines, command.fromIndex, command.toIndex)
			}

		case "UPDATE_RECEIPTLINE_DESCRIPTION":
			return {
				...state,
				receiptLines: changeAtIndex(state.receiptLines, command.index, { ...state.receiptLines[command.index], description: command.description })
			}

		case "UPDATE_RECEIPTLINE_AMOUNT":
			return {
				...state,
				receiptLines: changeAtIndex(state.receiptLines, command.index, { ...state.receiptLines[command.index], amount: command.amount })
			}

		case "UPDATE_RECEIPTLINE_WARRANTY":
			return {
				...state,
				receiptLines: changeAtIndex(state.receiptLines, command.index, { ...state.receiptLines[command.index], warranty: command.warranty })
			}
		case "UPDATE_RECEIPTLINE_DISPOSITIONSTATUS":
			return {
				...state,
				receiptLines: changeAtIndex(state.receiptLines, command.index, { ...state.receiptLines[command.index], dispositionStatus: command.dispositionStatus })
			}

		case "REMOVE_RECEIPTLINE":
			return {
				...state,
				receiptLines: removeAtIndex(state.receiptLines, command.index)
			}

		default:
			return state
	}
}


export const receiptLineMimeTypeConverters: MimeTypeConverterArray<ReceiptLine, number> = [
	{
		mimeType: "application/receipt-line-index+json",
		convertDragDataToPayload: (_, index) => ({ index }),
		convertDropPayloadToAction: (fromIndex, toIndex, _) => ({ action: "MOVE_RECEIPTLINE", fromIndex, toIndex })
	},
	{
		mimeType: "application/receipt-line-definition+json",
		convertDragDataToPayload: (receiptLine, _) => (receiptLine),
		convertDropPayloadToAction: (_1, _2, receiptLine) => ({ action: "ADD_RECEIPTLINE", receiptLine })
	},
	{
		mimeType: "text",
		convertDragDataToPayload: (receiptLine, _) => `${receiptLine.description} (${receiptLine.amount})`,
	}
]


const Component = (props: MetadataComponentProps) => {
	const state = props.state
	const dispatch = props.dispatch as React.Dispatch<Command>

	const dnd = useSortableDragDrop<ReceiptLine, HTMLDivElement>(
		".draghandle",
		receiptLineMimeTypeConverters,
		state.receiptLines,
		dispatch
	)

	const dropToCopy = useDrop<ReceiptLine, number>(
		receiptLineMimeTypeConverters.filter(converter => converter.mimeType === "application/receipt-line-definition+json"),
		dispatch
	)


	// const areThereEmptyLegs = state.receiptLines.some(receiptLine => !receiptLine.description && !receiptLine.amount && !receiptLine.currency && !receiptLine.warranty && !receiptLine.dispositionStatus)
	const lastReceiptLine = state.receiptLines?.at(-1)
	const isLastReceiptLineEmpty = (state.receiptLines?.length > 0 && !lastReceiptLine?.description && !lastReceiptLine?.amount && !lastReceiptLine?.currency && !lastReceiptLine?.warranty && !lastReceiptLine?.dispositionStatus)

	return (<>
		<label className="select mx-4" htmlFor="currency">
			<span className="label">Currency</span>
			<select id="currency"
				className="select"
				value={state.currency}
				onChange={e => dispatch({ action: "UPDATE_CURRENCY", currency: e.target.value })}
			>
				<option value="">-</option>
				<option value="NOK">NOK</option>
				<option value="DKK">DKK</option>
				<option value="EUR">EUR</option>
				<option value="GBP">GBP</option>
				<option value="SEK">SEK</option>
				<option value="USD">USD</option>
			</select>
		</label>

		<table className="table table-fixed">
			<thead>
				<tr>
					<th className="w-12"></th>
					<th className="w-53">Amount</th>
					<th className="w-1/2">Warranty</th>
					<th className="w-1/2">Status</th>
					<th className="w-12"></th>
				</tr>
			</thead>
			<tbody>
				{dnd.rows.map(({ rowType, data: receiptLine }, index) => rowType === "item-row"
					? <tr key={index}
						className="group/receiptline group has-[.delete-receiptline:hover]:bg-red-100! my-0"
						draggable={true}
						onMouseDown={dnd.mouseDown}
						onMouseUp={dnd.mouseUp}
						onDragStart={dnd.dragStart(index, receiptLine)}
						onDragOver={dnd.dragOver(index)}
						onDragEnd={dnd.dragEnd}
						ref={elmnt => { dnd.setElementRef(elmnt, index) }}
					>
						<td>
							<span className="draghandle cursor-grab">							
								<FontAwesomeIcon icon={faGripVertical} fixedWidth />
							</span>
						</td>
						<td>
							<label className="input w-full">
								<input
									type="text"
									className="input w-full"
									value={receiptLine.amount}
									onChange={e => dispatch({ action: "UPDATE_RECEIPTLINE_AMOUNT", index, amount: e.target.value })}
								/>
								<span className="label">{state.currency}</span>
							</label>
						</td>
						<td>
							<select
								className="select w-full"
								value={receiptLine.warranty}
								onChange={e => dispatch({ action: "UPDATE_RECEIPTLINE_WARRANTY", index, warranty: e.target.value })}
							>
								<option value="">-</option>
								<option value="1">Norsk garanti (2 år)</option>
								<option value="3">Norsk reklamasjon (5 år)</option>
							</select>
						</td>
						<td>
							<select
								className="select w-full"
								value={receiptLine.dispositionStatus}
								onChange={e => dispatch({ action: "UPDATE_RECEIPTLINE_DISPOSITIONSTATUS", index, dispositionStatus: e.target.value })}
							>
								<option value="">-</option>
								<option value="Sold">Sold</option>
								<option value="Scrapped">Scrapped</option>
								<option value="RTV">Return to vendor</option>
							</select>
						</td>
						<td>
							<button
								type="button"
								className="text-gray-400 group-hover:text-red-500 delete-receiptline"
								tabIndex={-1}
								onClick={() => { dispatch({ action: "REMOVE_RECEIPTLINE", index }) }}
							>
								<FontAwesomeIcon icon={faTrash} fixedWidth />
							</button>
						</td>
					</tr>
					: // row.rowType === "drop-row"
					<tr key={index}
						className="striped-background"
						style={{ width: dnd.draggedRect?.width, height: dnd.draggedRect?.height }}
						onDragEnd={dnd.dragEnd}
						onDragOver={e => e.preventDefault()}
						onDrop={dnd.handleDrop(index)}
						ref={elmnt => { dnd.setElementRef(elmnt, index) }}
					>
						<td colSpan={6}>
						</td>
					</tr>
				)}
				<tr className="">
					<td colSpan={6} className="text-center">
						<button type="button"
							disabled={isLastReceiptLineEmpty}
							className=""
							onDragOver={dropToCopy.dragOver(undefined as unknown as number)}
							onDrop={dropToCopy.handleDrop(undefined as unknown as number)}
							onClick={() => dispatch({ action: "ADD_RECEIPTLINE", receiptLine: { description: "", amount: "", warranty: "", dispositionStatus: "" } })}
						>
							<div className="flex flex-col items-center justify-center">
								<div className="">
									<FontAwesomeIcon icon={faPlus} />
								</div>
								<div className="text-sm">Add receipt line</div>
							</div>
						</button>
					</td>
				</tr>
				<tr>
					<td colSpan={6} className="h-0">
					</td>
				</tr>
			</tbody>
		</table>

	</>)
}


export default {
	displayName: "Receipt",
	summarize,
	path: "receipt",
	component: Component,
	reducer
} as MetadataType