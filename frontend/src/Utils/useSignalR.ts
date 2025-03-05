import { HttpTransportType, HubConnection, HubConnectionBuilder } from "@microsoft/signalr"
import { useEffect, useState } from "react"
import { accessTokenAtom, selectedTenantIdAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"


export type SignalRMessage = {
    messageType: string
    data: any
}

export const useSignalR = (
    callback: (message: SignalRMessage) => void
) => {
    const [connection, setConnection] = useState<HubConnection>(); // SignalR connection

    const tenantId = useAtomValue(selectedTenantIdAtom)
    const accessToken = useAtomValue(accessTokenAtom)

    useEffect(() => {
        if (accessToken === undefined || tenantId === undefined) {
            return
        }

        const connectToHub = async () => {
            const newConnection = new HubConnectionBuilder()
                .withUrl(`/notificationHub?tenantId=${tenantId}`, {
                    skipNegotiation: true,
                    transport: HttpTransportType.WebSockets,
                    accessTokenFactory: () => accessToken,
                    withCredentials: true
                })
                .withAutomaticReconnect()
                .build();

            try {
                await newConnection.start();
                console.log("Connected to SignalR hub");

                // Listen for messages from the server
                newConnection.on("ReceiveMessage", (message) => {
                    callback(message);
                });

                setConnection(newConnection);
            } catch (err) {
                console.error("Error connecting to SignalR hub:", err);
            }
        };


        connectToHub();

        // Cleanup connection on component unmount
        return () => {
            if (connection) {
                connection.stop();
            }
        };
    }, [accessToken]);
}