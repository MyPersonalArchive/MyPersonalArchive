import React from "react";
import { metadataComponentProps } from "./metadataComponents"

type ExpiryMetadataCommand =
    | { type: "SET_VALID_FROM"; date: string }
    | { type: "SET_VALID_UNTIL"; date: string }

type ExpiryState = {
    validFrom?: Date
    validUntil?: Date
}

const createInitialExpiryState = (): ExpiryState => {
    return {
        validFrom: undefined,
        validUntil: undefined
    }
}

interface ExpiryReducerState {
    expiry: ExpiryState
}
export const expiryReducer = (state: ExpiryReducerState, command: ExpiryMetadataCommand): any => {
    switch (command.action) {
        case "SET_VALID_FROM":
            return {
                ...state,
                expiry: {
                    ...state.expiry,
                    validFrom: command.date

                }
            }
        case "SET_VALID_UNTIL":
            return {
                ...state,
                expiry: {
                    ...state.expiry,
                    validUntil: command.date
                }
            }
        default:
            return state
    }
}

export const ExpiryMetadataComponent = (props: metadataComponentProps) => {
    const state = props.state as ExpiryReducerState
    state.expiry = state.expiry ?? createInitialExpiryState()
    const dispatch = props.dispatch as React.Dispatch<ExpiryMetadataCommand>

    return (
        <>
            Valid from:
            <input type="date" className="input" placeholder="Valid from" onChange={e => dispatch({ action: "SET_VALID_FROM", date: e.target.value })} />
            <br />
            Valid until:
            <input type="date" className="input" placeholder="Valid until" />
        </>
    )
}
