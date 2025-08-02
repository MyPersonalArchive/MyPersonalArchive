import React from "react"
import { MetadataComponentProps, MetadataType } from '../../Utils/Metadata/types'

type Command =
    | { action: "INIT" }
    | { action: "METADATA_LOADED", metadata: State }
    | { action: "SET_VALID_FROM", date: string }
    | { action: "SET_VALID_UNTIL", date: string }


type State = {
    validFrom: string
    validUntil: string
}


const reducer = (state: State, command: Command): State => {
    switch (command.action) {
        case "INIT":
            return {
                validFrom: "",
                validUntil: ""
            }

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

const Component = (props: MetadataComponentProps) => {
    const state = props.state
    const dispatch = props.dispatch as React.Dispatch<Command>

    return (
        <>
            <div className="aligned-labels-and-inputs">
                <label htmlFor="valid-from">Valid from</label>
                <input type="date" id="valid-from" className="input" placeholder="Valid from"
                    value={state.validFrom}
                    onChange={e => dispatch({ action: "SET_VALID_FROM", date: e.target.value })}
                />
            </div>

            <div className="aligned-labels-and-inputs">
                <label htmlFor="valid-from">Valid to</label>
                <input type="date" id="valid-to" className="input" placeholder="Valid until"
                    value={state.validUntil}
                    onChange={e => dispatch({ action: "SET_VALID_UNTIL", date: e.target.value })}
                />
            </div>
        </>
    )
}

export default {
    displayName: "Expiry",
    path: "expiry",
    component: Component,
    reducer
} as MetadataType