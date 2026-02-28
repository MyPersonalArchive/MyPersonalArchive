import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { EmailProvider, emailProvidersAtom } from "./Atoms/emailProvidersAtom"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"

type GetResponse = EmailProvider

export const useEmailProvidersPrefetching = () => {
	const setEmailProviders = useSetAtom(emailProvidersAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<GetResponse[]>("/api/query/GetEmailProviders")
			.then(emailProvidersFromResponse => {
				setEmailProviders(emailProvidersFromResponse!)
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "EmailProvidersUpdated": {
				apiClient.get<GetResponse[]>("/api/query/GetEmailProviders")
					.then(emailProvidersFromResponse => {
						setEmailProviders(emailProvidersFromResponse!)
					})
				break
			}
		}
	})
}
