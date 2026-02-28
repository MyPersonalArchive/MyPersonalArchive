import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { ExternalAccount, externalAccountsAtom } from "./Atoms/externalAccountsAtom"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"
import { UUID } from "crypto"

type GetResponse = {
	id: UUID
	displayName: string
	emailAddress: string
	type: string
	credentials: string
	provider: string
}

function mapResponseToModel(externalAccounts: GetResponse[] | undefined): ExternalAccount[] {
	return externalAccounts?.map(backendModel => ({
		id: backendModel.id,
		displayName: backendModel.displayName,
		emailAddress: backendModel.emailAddress,
		type: backendModel.type,
		credentials: backendModel.credentials,
		provider: backendModel.provider
	})) ?? []
}

export const useExternalAccountsPrefetching = () => {
	const dispatch = useSetAtom(externalAccountsAtom)
	const apiClient = useApiClient()

	useEffect(() => {
		apiClient.get<GetResponse[]>("/api/query/GetExternalAccounts")
			.then(externalAccountsFromResponse => {
				dispatch({ action: "LOAD", externalAccounts: mapResponseToModel(externalAccountsFromResponse) })
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "ExternalAccountsUpdated": {
				apiClient.get<GetResponse[]>("/api/query/GetExternalAccounts")
					.then(externalAccountsFromResponse => {
						dispatch({ action: "LOAD", externalAccounts: mapResponseToModel(externalAccountsFromResponse) })
					})
				break
			}
		}
	})
}
