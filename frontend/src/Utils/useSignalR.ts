import { HttpTransportType, HubConnectionBuilder } from "@microsoft/signalr"
import { useEffect, useRef } from "react"
import { accessTokenAtom, selectedTenantIdAtom, signalRConnectionAtom } from "../Utils/Atoms"
import { useAtom, useAtomValue } from "jotai"


export type SignalRMessage = {
    messageType: string
    data: any
}

export const useSignalR = (
    callback: (message: SignalRMessage) => void
) => {
    const [signalRConnection, setSignalRConnection] = useAtom(signalRConnectionAtom)
    const callbacksRef = useRef<Array<(message: SignalRMessage) => void>>([])

    const tenantId = useAtomValue(selectedTenantIdAtom)
    const accessToken = useAtomValue(accessTokenAtom)

    useEffect(() => {
        if (accessToken === undefined || tenantId === undefined) {
            return
        }

        (async () => {
            if (signalRConnection === undefined) {
                const newConnection = new HubConnectionBuilder()
                    .withUrl(`/notificationHub?tenantId=${tenantId}`, {
                        skipNegotiation: true,
                        transport: HttpTransportType.WebSockets,
                        accessTokenFactory: () => accessToken,
                        withCredentials: true
                    })
                    .withAutomaticReconnect()
                    .build()

                try {
                    await newConnection.start()
                    // console.log("Connected to SignalR hub")

                    // Listen for messages from the server
                    newConnection.on("ReceiveMessage", (message) => {
                        callbacksRef.current.forEach(cb => cb(message))
                    });

                    setSignalRConnection(newConnection)
                } catch (err) {
                    console.error("Error connecting to SignalR hub:", err)
                }
            }
        })();

        // Cleanup connection on component unmount
        return () => {
            if (callbacksRef.current.length === 0) {
                setSignalRConnection(current => {
                    // console.log("Disconnecting from SignalR hub - cleaning up")
                    current?.stop()
                    return undefined
                })
            }
        }
    }, [accessToken, tenantId])


    // console.log("*** X", callbacksRef.current)

    
    useEffect(() => {
        if (callbacksRef.current.indexOf(callback) === -1) {
            callbacksRef.current.push(callback)
        }

        // Cleanup connection on component unmount
        return () => {
            // callbackRef.current = callbackRef.current.filter(entry => entry === callback)
            callbacksRef.current.splice(callbacksRef.current.indexOf(callback), 1)
        }
    }, [])
}