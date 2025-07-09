import React from "react";
import { metadataComponentProps } from '../metadataTypesReducer';

type Command =
    | { path: "receipt", action: "SET_AMOUNT", amount: string }
    | { path: "receipt", action: "SET_CURRENCY", currency: string }
    | { path: "receipt", action: "SET_WARRANTY", warranty: string }

type State = {
    amount: string
    currency: string
    warranty: string
}

const reducer = (state: State, command: Command): State => {
    switch (command.action) {
        case "SET_AMOUNT":
            return {
                ...state,
                amount: command.amount
            }

        case "SET_CURRENCY":
            return {
                ...state,
                currency: command.currency
            }

        case "SET_WARRANTY":
            return {
                ...state,
                warranty: command.warranty
            }

        default:
            return state
    }
}


const Component = (props: metadataComponentProps) => {
    const state = props.state as State ?? reducer(undefined, { path: "receipt", action: "INIT" })
    const dispatch = props.dispatch as React.Dispatch<Command>

    return (
        <>
            <div>
                <label htmlFor="amount">Amount</label>
                &nbsp;
                <input type="text" id="amount" className="input" placeholder="Amount"
                    value={state.amount}
                    onChange={e => dispatch({ path: "receipt", action: "SET_AMOUNT", amount: e.target.value })}
                />
                <select
                    value={state.currency}
                    onChange={e => dispatch({ path: "receipt", action: "SET_CURRENCY", currency: e.target.value })}
                >
                    <option value="">-</option>
                    <option value="NOK">NOK</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="SEK">SEK</option>
                </select>
            </div>
            <div>
                <label htmlFor="warranty">Warranty</label>
                &nbsp;
                <select id="warranty"
                    value={state.warranty}
                    onChange={e => dispatch({ path: "receipt", action: "SET_WARRANTY", warranty: e.target.value })}
                >
                    <option value="">-</option>
                    <option value="1">Norsk garanti (2 år)</option>
                    <option value="3">Norsk reklamasjon (5 år)</option>
                </select>
            </div>
        </>
    )
}


export default {
    name: "Receipt",
    path: "receipt",
    empty: {
        amount: "",
        currency: "",
        warranty: ""
    },
    component: Component,
    reducer
} as const