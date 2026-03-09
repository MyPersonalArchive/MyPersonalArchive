import { UUID } from "crypto"
import { changeAtIndex, changeAtKey, moveInArray, removeAtIndex, removeAtKey } from "../array-helpers"
import { atomWithReducer } from "jotai/utils"
import { MimeTypeConverterArray } from "../../Components/DragDropHelpers"


export type ExternalAccount = {
	id: UUID
	displayName: string
	emailAddress: string
	credentials: any
	type: string
	provider: string
}


export const externalAccountsMimeTypeConverters: MimeTypeConverterArray<ExternalAccount, number> = [
	{
		mimeType: "application/external-account+index+json",
		convertDragDataToPayload: (_, index) => ({ index }),
		convertDropPayloadToAction: (fromIndex, toIndex, _) => ({ action: "MOVE_ACCOUNT", fromIndex, toIndex })
	},
	{
		mimeType: "text",
		convertDragDataToPayload: (externalAccount, _) => `${externalAccount.displayName}`,
	}
]


type ExternalAccountsCommand =
	| { action: "LOAD", externalAccounts: ExternalAccount[] }
	| { action: "REMOVE_ACCOUNT", id: UUID }
	| { action: "MOVE_ACCOUNT", fromIndex: number, toIndex: number }
	| { action: "EDIT_ACCOUNT_DISPLAYNAME", id: UUID, displayName: string }
	| { action: "EDIT_ACCOUNT_CREDENTIALS", id: UUID, credentials?: string }
	| { action: "EDIT_ACCOUNT_TYPE", id: UUID, type?: string }
	| { action: "EDIT_ACCOUNT_PROVIDER", id: UUID, provider?: string }

const reducer = (state: ExternalAccount[], command: ExternalAccountsCommand): ExternalAccount[] => {
	switch (command.action) {
		case "LOAD":
			return [...command.externalAccounts]

		case "REMOVE_ACCOUNT":
			return removeAtKey(state, account => account.id === command.id)

		case "MOVE_ACCOUNT":
			return moveInArray(state, command.fromIndex, command.toIndex)

		case "EDIT_ACCOUNT_DISPLAYNAME":
			return changeAtKey(
				state,
				account => account.id === command.id,
				account => ({
					...account,
					displayName: command.displayName
				})
			)

		case "EDIT_ACCOUNT_CREDENTIALS":
			return changeAtKey(
				state,
				account => account.id === command.id,
				account => ({
					...account,
					credentials: command.credentials ?? account.credentials
				})
			)

		case "EDIT_ACCOUNT_TYPE":
			return changeAtKey(
				state,
				account => account.id === command.id,
				account => ({
					...account,
					type: command.type ?? account.type
				})
			)

		case "EDIT_ACCOUNT_PROVIDER":
			return changeAtKey(
				state,
				account => account.id === command.id,
				account => ({
					...account,
					provider: command.provider ?? account.provider
				})
			)
	}
}


export const externalAccountsAtom = atomWithReducer<ExternalAccount[], ExternalAccountsCommand>([], reducer)