import React from "react";
import { metadataComponentProps } from "./metadataComponents";

type ReceiptMetadataCommand =
    | { action: "SET_AMOUNT"; amount: string }
    | { action: "SET_CURRENCY"; currency: string }
    | { action: "SET_WARRANTY"; warranty: string }

type ReceiptState = {
    amount?: string
    currency?: string
    warranty?: string
}

const createInitialReceiptState = () : ReceiptState => {
    return {
        amount: "",
        currency: "",
        warranty: "",
    }
}

interface ReceiptReducerState {
    receipt: ReceiptState
}
export const receiptReducer = (state: ReceiptReducerState, command: ReceiptMetadataCommand): ReceiptReducerState => {
    switch (command.action) {
        case "SET_AMOUNT":
            return {
                ...state,
                receipt: {
                    ...state.receipt,
                    amount: command.amount
                }
            }

        case "SET_CURRENCY":
            return {
                ...state,
                receipt: {
                    ...state.receipt,
                    currency: command.currency
                }
            }

        case "SET_WARRANTY":
            return {
                ...state,
                receipt: {
                    ...state.receipt,
                    warranty: command.warranty
                }
            }

        default:
            return state
    }
}


export const ReceiptMetadataComponent = (props: metadataComponentProps) => {
    const state = props.state as ReceiptReducerState
    state.receipt = state.receipt ?? createInitialReceiptState()
    const dispatch = props.dispatch as React.Dispatch<ReceiptMetadataCommand>
    
    return (
        <>
            Amount:
            <input type="text" className="input" placeholder="Amount" value={state.receipt.amount} onChange={e => dispatch({ action: "SET_AMOUNT", amount: e.target.value })} />
            <select value={state.receipt.currency} onChange={e => dispatch({ action: "SET_CURRENCY", currency: e.target.value })}>
                <option>-</option>
                <option value="NOK">NOK</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SEK">SEK</option>
            </select>
            <br />
            Warranty: <select value={state.receipt.warranty} onChange={e => dispatch({ action: "SET_WARRANTY", warranty: e.target.value })}>
                <option>-</option>
                <option value="1">Norsk garanti (2 år)</option>
                <option value="3">Norsk reklamasjon (5 år)</option>
            </select>
        </>
    )
}