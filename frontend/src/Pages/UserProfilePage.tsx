import { useAtom, useAtomValue } from "jotai"
import { Link, useNavigate } from "react-router-dom"
import { ExternalAccount, externalAccountsAtom } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { useContext } from "react"
import { CurrentTenantIdContext } from "../Frames/CurrentTenantIdContext"
import { RoutePaths } from "../RoutePaths"
import { MimeTypeConverterArray, useSortableDragDrop } from "../Components/DragDropHelpers"
import { useApiClient } from "../Utils/useApiClient"


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
	const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)
	const navigate = useNavigate()
	const apiClient = useApiClient()

	const [accounts, dispatch] = useAtom(externalAccountsAtom)

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
						<th>Account</th>
						<th>Type</th>
						<th>Provider</th>
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
								<td>{account.credentials}</td>
								<td>{account.type}</td>
								<td>{account.provider}</td>
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
				<button className="btn" >New</button>
				<button className="btn" onClick={save}>Save</button>
			</div>


		</>
	)
}