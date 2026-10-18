import { faPlus, faUser, faUserTie, faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useAtom } from "jotai"
import { usersAtom } from "../Utils/Atoms/usersAtom"
import { Dialog } from "../Components/Dialog"
import { ConfirmationDialog } from "../Components/ConfirmationDialog"
import { useSignalR } from "../Utils/Hooks/useSignalR"

export type UserRole = "accountOwner" | "administrator" | "user"

export type ListUsersResponse = {
	issuer: string
	subject: string
	fullname: string
	email?: string
	roles: string[]
}

type ListInvitationsResponse = {
	id: string
	email: string
	fullname: string
	expiresAt: string
}


export const TenantAdminUsersPage = () => {
	const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
	const apiClient = useApiClient()
	const [users, setUsers] = useAtom(usersAtom)
	const [invitations, setInvitations] = useState<ListInvitationsResponse[]>([])
	const [userToRemove, setUserToRemove] = useState<ListUsersResponse>()

	const loadInvitations = () =>
		apiClient.query<ListInvitationsResponse[]>("ListInvitations")
			.then(response => setInvitations(response ?? []))

	const loadUsers = () =>
		apiClient.query<ListUsersResponse[]>("ListUsers")
			.then(response => {
				setUsers(response!.map(user => ({
					issuer: user.issuer,
					subject: user.subject,
					fullname: user.fullname,
					email: user.email,
					roles: user.roles
				})))
			})

	useEffect(() => {
		loadInvitations()
		loadUsers()
	}, [])

	useSignalR(message => {
		if (message.messageType === "InvitationsUpdated") {
			loadInvitations()
		}
		if (message.messageType === "UsersUpdated") {
			loadUsers()
		}
	})

	const removeUser = async () => {
		if (!userToRemove)
			return
		try {
			await apiClient.execute("RemoveUser", { subject: userToRemove.subject })
		} catch (error) {
			console.error("Failed to remove user:", error)
		}
		setUserToRemove(undefined)
	}

	return (
		<>
			<div className="form">
				<header className="header">
					<h1>Users and permissions</h1>
				</header>

				<div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-4 my-4">
					{
						users.map(user => (
							<div key={user.subject} className="card bg-base-100 shadow-sm group/user has-[.remove-user:hover]:bg-red-100">
								<div className="p-2">
									<div className="">
										<div className="font-bold">
											<FontAwesomeIcon icon={user.roles.includes("Owner") || user.roles.includes("Administrator") ? faUserTie : faUser} fixedWidth />
											{user.fullname}
										</div>
										{!user.roles.includes("Owner") &&
											<button
												className="text-gray-400 group-hover/user:text-red-500 top-2 right-2 absolute remove-user"
												onClick={() => setUserToRemove(user)}
											>
												<FontAwesomeIcon icon={faTrash} fixedWidth />
											</button>
										}
									</div>

									<div className="text-sm my-2 px-4">{user.email}</div>


									{
										user.roles.includes("Owner")
											? <button
												className="btn my-2 px-4 w-full"
												onClick={() => alert("Transfer ownership not implemented yet")}
											>
												Transfer ownership
											</button>
											: <select className="select my-2 px-4">
												<option value="administrator" selected={user.roles.length > 0 && ["accountOwner", "administrator"].includes(user.roles[0])}>Administrator</option>
												<option value="user" selected={user.roles.length === 0}>User</option>
											</select>
									}

								</div>
							</div>
						))
					}

					<button
						className="btn btn-dash rounded-lg w-full h-full"
						onClick={() => setIsAddUserDialogOpen(true)}
					>
						<div className="flex flex-col items-center justify-center w-full h-full">
							<div className="text-7xl">
								<FontAwesomeIcon icon={faPlus} />
							</div>
							<div className="text-sm">Invite user</div>
						</div>
					</button>

				</div>


				<table className="w-full">
					<thead>
						<tr>
							<th className="text-left text-lg font-semibold" colSpan={4}>Pending invitations</th>
						</tr>
					</thead>
					<tbody className=" text-sm">
						{
							invitations.length === 0 && (
								<tr>
									<td colSpan={4} className="text-center text-gray-500">
										No pending invitations.
									</td>
								</tr>
							)
						}
						{
							invitations.map(invitation => (
								<tr key={invitation.id} className="hover:bg-gray-200 group/invitation has-[.cancel-invitation:hover]:bg-red-100">
									<td>{invitation.email}</td>
									<td>{invitation.fullname}</td>
									<td className="text-right">
										Valid until {new Date(invitation.expiresAt).toLocaleString()}
										<button
											className="text-gray-400 group-hover/invitation:text-red-500 cancel-invitation"
											onClick={() => apiClient.execute("CancelInvitation", { invitationId: invitation.id })}
										>
											<FontAwesomeIcon icon={faTrash} fixedWidth />
										</button>
									</td>
									<td className="text-right">
										<button
											className="link"
											onClick={() => apiClient.execute("ResendInvitation", { invitationId: invitation.id })}
										>
											Resend invitation
										</button>
									</td>
								</tr>
							))
						}
					</tbody>
				</table>
			</div>

			<InviteUserDialog
				isOpen={isAddUserDialogOpen}
				onClose={() => setIsAddUserDialogOpen(false)}
			/>

			<ConfirmationDialog
				open={userToRemove !== undefined}
				prompt={`Remove ${userToRemove?.fullname} from the organization?`}
				onClose={() => setUserToRemove(undefined)}
				onConfirm={removeUser}
			/>
		</>
	)
}


const InviteUserDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
	const apiClient = useApiClient()

	const [email, setEmail] = useState("")
	const [firstName, setFirstName] = useState("")
	const [lastName, setLastName] = useState("")

	const inviteUser = async (e: React.MouseEvent<HTMLButtonElement>) => {
		e.preventDefault()
		try {
			await apiClient.execute("inviteUser", { email, firstName, lastName })
			// TODO: If user already has a pending invitation, resend the invitation instead.
			onClose()
		} catch (error) {
			console.error("Failed to invite user:", error)
		}
	}

	return !isOpen
		? null
		: (
			<Dialog onClose={onClose} closeOnEscape={true}>
				<form className="p-4">
					<h2 className="text-lg font-bold">Invite User</h2>

					<label className="dont-touch-walls input w-full mt-4" htmlFor="email">
						<span className="label">Email</span>
						<input type="email" className="input" id="email" value={email} onChange={e => setEmail(e.target.value)} />
					</label>
					<label className="dont-touch-walls input w-full mt-4" htmlFor="firstName">
						<span className="label">First name</span>
						<input type="text" className="input" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
					</label>
					<label className="dont-touch-walls input w-full mt-4" htmlFor="lastName">
						<span className="label">Last name</span>
						<input type="text" className="input" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
					</label>
					<div className="flex justify-end gap-2 mt-4">
						<button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
						<button type="submit" className="btn btn-primary" onClick={inviteUser}>invite</button>
					</div>
				</form>
			</Dialog>
		)
}