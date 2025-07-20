import React from "react";
import { metadataComponentProps } from '../metadataTypesReducer';

type Command =
    | { path: "expiry", action: "INIT" }
    | { path: "expiry", action: "METADATA_LOADED", metadata: State }
    | { path: "expiry", action: "SET_VALID_FROM", date: string }
    | { path: "expiry", action: "SET_VALID_UNTIL", date: string }


type State = {
    validFrom: string
    validUntil: string
}

const empty: State = {
    validFrom: "",
    validUntil: ""
}

const reducer = (state: State, command: Command): State => {
    switch (command.action) {
        case "INIT":
            return empty
            
        case "METADATA_LOADED":
            return {
                ...state,
                ...command.metadata
            }

        case "SET_VALID_FROM":
            return {
                ...state,
                validFrom: command.date
            }
        case "SET_VALID_UNTIL":
            return {
                ...state,
                validUntil: command.date
            }
        default:
            return state
    }
}

const Component = (props: metadataComponentProps) => {
    const state = props.state as State
    const dispatch = props.dispatch as React.Dispatch<Command>

    return (
        <>
            <div className="horizontal-stacked-flex">
                <div>
                    <label htmlFor="valid-from">Valid from</label>
                    &nbsp;
                    <input type="date" id="valid-from" className="input" placeholder="Valid from"
                        value={state.validFrom}
                        onChange={e => dispatch({ path: "expiry", action: "SET_VALID_FROM", date: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="valid-from">Valid to</label>
                    &nbsp;
                    <input type="date" id="valid-to" className="input" placeholder="Valid until"
                        value={state.validUntil}
                        onChange={e => dispatch({ path: "expiry", action: "SET_VALID_UNTIL", date: e.target.value })}
                    />
                </div>
            </div>
        </>
    )
}

export default {
    name: "Expiry",
    path: "expiry",
    empty,
    component: Component,
    reducer
} as const