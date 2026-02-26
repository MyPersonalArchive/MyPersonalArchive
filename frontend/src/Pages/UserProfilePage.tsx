import { useAtom, useAtomValue } from "jotai"
import { useNavigate } from "react-router-dom"
import { ExternalAccount, externalAccountsAtom } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { useContext, useEffect, useState } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { RoutePaths } from "../RoutePaths"
import { MimeTypeConverterArray, useSortableDragDrop } from "../Components/DragDropHelpers"
import { useApiClient } from "../Utils/useApiClient"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan } from "@fortawesome/free-solid-svg-icons"
import { useRemoteAuthentication } from "../Utils/useRemoteAuthentication"


const mimeTypeConverters: MimeTypeConverterArray<ExternalAccount, number> = [
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


export const UserProfilePage = () => {
	const currentUser = useAtomValue(currentUserAtom)
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)

	const navigate = useNavigate()
	const apiClient = useApiClient()


	const dnd = useSortableDragDrop<ExternalAccount, HTMLDivElement>(
		".draghandle",
		mimeTypeConverters,
		accounts,
		dispatch
	)

	const switchTenant = (tenantId: number) => {
		switchToTenantId(tenantId)
		navigate(RoutePaths.Index)
	}

	const save = async () => {
		try {
			await apiClient.post("/api/execute/SaveExternalAccounts", {
				externalAccounts: accounts.map((account: ExternalAccount) => ({
					id: account.id,
					displayName: account.displayName,
					emailAddress: account.emailAddress,
					credentials: account.credentials,
					type: account.type,
					provider: account.provider
				}))
			})
		} catch (error) {
			console.error("Failed to save external accounts:", error)
		}
	}


	return (
		<>
			<h1 className="heading-1">
				My profile
			</h1>

			{
				currentUser !== undefined && currentUser.availableTenantIds.length > 1 &&
				<div className="aligned-labels-and-inputs">
					<label htmlFor="tenant">Current tenant</label>
					<select className="input"
						id="tenant"
						defaultValue={currentTenantId?.toString()}
						onChange={(e) => switchTenant(parseInt(e.target.value))}
					>
						{currentUser?.availableTenantIds?.map((tenantId) => (
							<option key={tenantId} value={tenantId}>
								{tenantId}
							</option>
						))}
					</select>
				</div>
			}

			<h2 className="heading-2 mt-6">
				Connected Accounts
			</h2>
			<table className="w-full table with-column-seperators">
				<thead>
					<tr>
						<th className="w-4"></th>
						<th>Display name</th>
						<th>Email address</th>
						<th>Expires at</th>
						<th className="w-4"></th>
					</tr>
				</thead>
				<tbody>
					{/* {
						accounts.length === 0 &&
						<tr>
							<td></td>
							<td colSpan={4} className="text-center italic text-gray-500 py-4">
								No connected accounts found
							</td>
						</tr>
					} */}
					{
						dnd.rows.map(({ rowType, data: account }, index) => rowType === "item-row"
							?
							<tr key={account.id}
								className="h-10 bg-white hover:bg-gray-100 m-0 p-0"
								draggable={true}
								onMouseDown={dnd.mouseDown}
								onMouseUp={dnd.mouseUp}
								onDragStart={dnd.dragStart(index, account)}
								onDragOver={dnd.dragOver(index)}
								onDragEnd={dnd.dragEnd}
								ref={elmnt => { dnd.setElementRef(elmnt, index) }}
							>
								<td className="draghandle cursor-grab">☰</td>
								<td className="">
									<input className=""
										type="text"
										value={account.displayName}
										onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", index, displayName: e.target.value })} />
								</td>
								<td>{account.emailAddress}</td>
								<td>
									{account.credentials.expiresAt}
									{account.credentials.expiresAt !== undefined && account.credentials.expiresAt < new Date().toISOString() &&
										<span className="text-red-500 font-bold"> [EXPIRED]</span>
									}
								</td>
								<td>
									<button style={{ marginLeft: "10px" }} className=" text-red-500 cursor-pointer" onClick={() => dispatch({ action: "REMOVE_ACCOUNT", index })}>
										<FontAwesomeIcon icon={faTrashCan} size="1x" />
									</button>
								</td>
							</tr>
							: <tr key={account.id}
								className="h-10 striped-background"
								onDragEnd={dnd.dragEnd}
								onDragOver={e => e.preventDefault()}
								onDrop={dnd.handleDrop(index)}
								ref={elmnt => { dnd.setElementRef(elmnt, index) }}
							>
								<td colSpan={5} className="striped-background">
								</td>
							</tr>
						)
					}
				</tbody>
			</table>

			<div className="stack-horizontal to-the-right my-4">
				Connect new account:
				<ConnectNewAccount />

				<button className="btn" onClick={save}>Save</button>
			</div>


		</>
	)
}


type EmailProvider = {
	provider: string,
	displayName: string,
	authTypes: AuthType[]
}

type AuthType = {
	type: string
}

type EmailProviderOption = {
	provider: string,
	lookup: string,
	displayName: string,
	authType: string
}


export const ConnectNewAccount = () => {
	const [selectedEmailProviderOption, setSelectedEmailProviderOption] = useState<EmailProviderOption | null>(null)
	const { login } = useRemoteAuthentication()

	const apiClient = useApiClient()
	const [emailProviderOptions, setEmailProviderOptions] = useState<EmailProviderOption[]>([])

	useEffect(() => {
		apiClient.get<EmailProvider[]>("/api/query/GetEmailProviders")
			.then(providers => {
				console.log("Available email providers from backend:", providers)
				setEmailProviderOptions(providers!.flatMap(p => p.authTypes.map(at => ({
					provider: p.provider,
					lookup: `${p.provider}+${at.type}`,
					displayName: `${p.displayName} (${at.type})`,
					authType: at.type
				}))))
			}).catch(error => {
				console.error("Failed to load email providers from backend:", error)
			})
	}, [])

	return (
		<div className="group">
			<select className="input" value={selectedEmailProviderOption?.lookup || ""} onChange={e => setSelectedEmailProviderOption(emailProviderOptions.find(p => p.lookup === e.target.value) || null)}>
				{emailProviderOptions.map(p => (
					<option key={p.lookup} value={p.lookup}>{p.displayName}</option>
				))}
			</select>

			<button className="btn"
				onClick={() => login(selectedEmailProviderOption!.provider, selectedEmailProviderOption?.authType as ("oauth" | "basic"), window.location.origin + "/email")}
				disabled={selectedEmailProviderOption === null}
			>
				Authenticate
			</button>
		</div>
	)
}