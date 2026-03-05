import { UUID } from "crypto"
import { changeAtIndex, moveInArray, removeAtIndex } from "../array-helpers"
import { atomWithReducer } from "jotai/utils"


export type ExternalAccount = {
	id: UUID
	displayName: string
	emailAddress: string
	credentials: any
	type: string
	provider: string
}


type ExternalAccountsCommand =
	| { action: "LOAD", externalAccounts: ExternalAccount[] }
	| { action: "REMOVE_ACCOUNT", index: number }
	| { action: "MOVE_ACCOUNT", fromIndex: number, toIndex: number }
	| { action: "EDIT_ACCOUNT_DISPLAYNAME", index: number, displayName: string }
	| { action: "EDIT_ACCOUNT_CREDENTIALS", index: number, credentials?: string }
	| { action: "EDIT_ACCOUNT_TYPE", index: number, type?: string }
	| { action: "EDIT_ACCOUNT_PROVIDER", index: number, provider?: string }

const reducer = (state: ExternalAccount[], command: ExternalAccountsCommand): ExternalAccount[] => {
	switch (command.action) {
		case "LOAD":
			return [...command.externalAccounts]

		case "REMOVE_ACCOUNT":
			return removeAtIndex(state, command.index)

		case "MOVE_ACCOUNT":
			return moveInArray(state, command.fromIndex, command.toIndex)

		case "EDIT_ACCOUNT_DISPLAYNAME":
			return changeAtIndex(
				state,
				command.index,
				account => ({
					...account,
					displayName: command.displayName
				})
			)

		case "EDIT_ACCOUNT_CREDENTIALS":
			return changeAtIndex(
				state,
				command.index,
				account => ({
					...account,
					credentials: command.credentials ?? account.credentials
				})
			)

		case "EDIT_ACCOUNT_TYPE":
			return changeAtIndex(
				state,
				command.index,
				account => ({
					...account,
					type: command.type ?? account.type
				})
			)

		case "EDIT_ACCOUNT_PROVIDER":
			return changeAtIndex(
				state,
				command.index,
				account => ({
					...account,
					provider: command.provider ?? account.provider
				})
			)
	}
}


export const externalAccountsAtom = atomWithReducer<ExternalAccount[], ExternalAccountsCommand>([], reducer)