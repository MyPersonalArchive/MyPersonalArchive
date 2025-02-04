import { HttpTransportType, HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr"
import React, { useEffect } from "react"
import { accessTokenAtom, loggedInUserAtom, signalRCallbacksAtom, SignalRMessage } from "../Utils/Atoms"
import { useAtom, useAtomValue } from "jotai"
import { Outlet } from "react-router-dom"

type SignalRContext = {
    registerCallback: (
        messageType: string,
        onReceivedCallback: (message: SignalRMessage) => void
    ) => void,
    // sendMessageToServer: (message: SignalRMessage) => void
}
const SignalRContext = React.createContext<SignalRContext | undefined>(undefined)


export const useSignalR = (
    messageType: string,
    callback: (message: SignalRMessage) => void
) => {
    const context = React.useContext(SignalRContext)
    if (!context) {
        throw new Error("useSignalR must be used within a SignalRProvider")
    }
    context.registerCallback(messageType, callback)
}


export const SignalRProvider = () => {
    const accessToken = useAtomValue(accessTokenAtom)
    const loggedInUser = useAtomValue(loggedInUserAtom)

    const [callbacks, setCallbacks] = useAtom(signalRCallbacksAtom)

    useEffect(() => {
        (async () => {
            const conn = new HubConnectionBuilder()
                .withUrl("/notificationHub", {
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets,
                    accessTokenFactory: () => accessToken!
                })
                .withAutomaticReconnect()
                .build()

            try {
                await conn.start()
            } catch (ex) { /* empty */ }

            const username = loggedInUser?.username
            if (conn.state === HubConnectionState.Connected && username) {
                await conn.invoke("JoinUserChannel", username)

                conn.on("userChannel", (data: SignalRMessage) => {
                    console.log("*** SignalR - message received:", data)

                    callbacks.get(data.type)?.(data)    // single subscription pr message type
                    // callbacks.get(data.type)?.forEach(callback => callback(data))    // multiple subscriptions pr message type
                })
            }
        })()
    }, [])

    const context = {
        registerCallback: (
            messageType: string,
            onReceivedCallback: (message: SignalRMessage) => void
        ) => {
            setCallbacks(new Map([...callbacks.entries(), [messageType, onReceivedCallback]]))
        }
    }

    return (
        <SignalRContext.Provider value={context} >
            <Outlet />
        </SignalRContext.Provider>
    )
}