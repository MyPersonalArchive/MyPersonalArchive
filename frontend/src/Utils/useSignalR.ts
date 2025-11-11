import { HttpTransportType, HubConnectionBuilder, LogLevel } from "@microsoft/signalr"
import { useContext, useEffect, useRef } from "react"
import { signalRConnectionAtom } from "../Utils/Atoms"
import { useAtom } from "jotai"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"


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

	useEffect(() => {
		(async () => {
			const url = `/notificationHub?tenantId=${currentTenantId}`
			const connection = signalRConnection ?? await ensureSignalRConnection(url)

			connection.on("ReceiveMessage", (message) => {
				callbacksRef.current.forEach(cb => cb(message))
			})

			setSignalRConnection(connection)
		})()

		// Cleanup connection on component unmount
		return () => {
			if (callbacksRef.current.length === 0) {
				setSignalRConnection(current => {
					current?.stop()
					return undefined
				})
			}
		}
	}, [currentTenantId])


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

const ensureSignalRConnection = async (url: string) => {
	const connection = new HubConnectionBuilder()
		.withUrl(url, {
			skipNegotiation: true,
			transport: HttpTransportType.WebSockets,
			withCredentials: true
		})
		.configureLogging(LogLevel.Warning)
		.withAutomaticReconnect()
		.build()

	await connection.start()

	return connection
}