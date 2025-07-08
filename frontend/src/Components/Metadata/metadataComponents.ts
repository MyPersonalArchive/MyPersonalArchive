import React, { Dispatch } from 'react'
import { ReceiptMetadataComponent, receiptReducer } from './ReceiptMetadataComponent'
import { ExpiryMetadataComponent, expiryReducer } from './ExpiryMetadataComponent'

export type metadataComponentProps = {
    state: unknown,
    dispatch: Dispatch<unknown>
    // state: unknown,
    // dispatch: (action: unknown) => unknown
}

export type reducer = (state: any, command: any) => unknown

type Component = { name: string, reducer: reducer, component: React.FC<{ state: unknown, dispatch: (action: unknown) => unknown }> }

export const metadataComponents: Array<Component> = [
    { name: "Receipt", reducer: receiptReducer, component: ReceiptMetadataComponent },
    { name: "Expiry", reducer: expiryReducer, component: ExpiryMetadataComponent }
]

export const combinedReducer = (components: Array<Component>) => (state: any, command: any): unknown => {
    components.forEach(component => {
        state = component.reducer(state, command)
    })
    return state
}