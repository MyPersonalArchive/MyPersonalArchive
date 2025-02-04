import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type User = {
    username: string,
    fullname: string,
}
export const loggedInUserAtom = atom<User>()

export const accessTokenAtom = atom<string>()

export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })


export type SignalRMessage = {
    type: string
    text: string
    body: string
}
type SignalRCallbacks = Map<
    string,
    (message: SignalRMessage) => void   // single subscription pr message type
    // [(message: SignalRMessage) => void]  // multiple subscriptions pr message type
>
export const signalRCallbacksAtom = atom<SignalRCallbacks>(new Map())

