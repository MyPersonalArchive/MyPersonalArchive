import { useSetAtom } from "jotai"
import { useApiClient } from "./useApiClient"
import { Account, accountsAtom } from "./Atoms"
import { useEffect } from "react"
import { SignalRMessage, useSignalR } from "./useSignalR"

export const useAccountsPrefetching = () => {
	const setAccounts = useSetAtom(accountsAtom)
	const apiClient = useApiClient()


	useEffect(() => {
		apiClient.get<Account[]>("/api/query/ListAccounts")
			.then(accounts => {
				setAccounts(accounts!)
			})
	}, [])

	useSignalR((message: SignalRMessage) => {
		switch (message.messageType) {
			case "AccountCreated": {
				setAccounts(accounts => [...accounts, message.data])
				break
			}
			case "AccountDeleted": {
				setAccounts(accounts => accounts.filter(account => account.id !== message.data.id))
				break
			}
			case "AccountUpdated": {
				setAccounts(accounts => accounts.map(account => account.id === message.data.id ? message.data : account))
				break
			}
		}
	})
}