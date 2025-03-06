import { HttpTransportType, HubConnectionBuilder, LogLevel } from "@microsoft/signalr"
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
            const url = `/notificationHub?tenantId=${tenantId}`
            const connection = signalRConnection ?? await ensureSignalRConnection(url, accessToken)

            connection.on("ReceiveMessage", (message) => {
                callbacksRef.current.forEach(cb => cb(message))
            });

            setSignalRConnection(connection)
        })();

        // Cleanup connection on component unmount
        return () => {
            if (callbacksRef.current.length === 0) {
                setSignalRConnection(current => {
                    console.log("Disconnecting from SignalR hub")
                    current?.stop()
                    return undefined
                })
            }
        }
    }, [accessToken, tenantId])


    useEffect(() => {
        if (callbacksRef.current.indexOf(callback) === -1) {
            callbacksRef.current.push(callback)
        }

        // Cleanup connection on component unmount
        return () => {
            callbacksRef.current.splice(callbacksRef.current.indexOf(callback), 1)
        }
    }, [])
}

const ensureSignalRConnection = async (url: string, accessToken: string) => {
    const connection = new HubConnectionBuilder()
        .withUrl(url, {
            skipNegotiation: true,
            transport: HttpTransportType.WebSockets,
            accessTokenFactory: () => accessToken,
            withCredentials: true
        })
        .configureLogging(LogLevel.Warning)
        .withAutomaticReconnect()
        .build()

    await connection.start()

    return connection
}