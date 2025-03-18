import { HttpTransportType, HubConnectionBuilder, LogLevel } from "@microsoft/signalr"
import { useContext, useEffect, useRef } from "react"
import { accessTokenAtom, signalRConnectionAtom } from "../Utils/Atoms"
import { useAtom, useAtomValue } from "jotai"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdFrame"


export type SignalRMessage = {
    messageType: string
    data: any
}

export const useSignalR = (
    callback: (message: SignalRMessage) => void
) => {
    const [signalRConnection, setSignalRConnection] = useAtom(signalRConnectionAtom)
    const callbacksRef = useRef<Array<(message: SignalRMessage) => void>>([])

    const { currentTenantId } = useContext(CurrentTenantIdContext)
    const accessToken = useAtomValue(accessTokenAtom)

    useEffect(() => {
        if (accessToken === undefined || currentTenantId === undefined) {
            return
        }

        (async () => {
            const url = `/notificationHub?tenantId=${currentTenantId}`
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
                    current?.stop()
                    return undefined
                })
            }
        }
    }, [accessToken, currentTenantId])


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