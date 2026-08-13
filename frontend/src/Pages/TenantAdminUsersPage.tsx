import { faPlus, faUser, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect } from "react"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { useAtom } from "jotai"
import { usersAtom } from "../Utils/Atoms/usersAtom"

export type UserRole = "accountOwner" | "administrator" | "user"

export type ListUsersResponse = {
	issuer: string
	subject: string
	fullname: string
	roles: string[]
}


export const TenantAdminUsersPage = () => {
	const apiClient = useApiClient()
	const [users, setUsers] = useAtom(usersAtom)

	useEffect(() => {
		apiClient.query<ListUsersResponse[]>("ListUsers")
			.then(response => {
				setUsers(response!.map(user => ({
					issuer: user.issuer,
					subject: user.subject,
					fullname: user.fullname,
					roles: user.roles
				})))
			})
	}, [])

	return (
		<div className="form">
			<header className="header">
				<h1>Users and permissions</h1>
			</header>

			<div className="flex gap-3 flex-wrap">
				{
					users.map(user => (
						<div key={user.subject} className="card flex flex-row relative w-73">
							<div className="p-2 grow">
								<div className="flex flex-col py-2 px-4">
									<div className="font-bold">
										<FontAwesomeIcon icon={user.roles.includes("Owner") || user.roles.includes("Administrator") ? faUserTie : faUser} fixedWidth />
										{user.fullname}
									</div>
									<div className="text-sm">({user.roles.join(", ")})</div>
									<div className="text-sm">Email: {user.subject}</div>
								</div>
							</div>
						</div>
					))
				}

				<button className="card flex flex-row relative w-73" onClick={() => alert("Invite user button clicked - Not implemented yet")}>
					<div className="flex flex-col items-center justify-center w-full h-full">
						<div className="text-7xl">
							<FontAwesomeIcon icon={faPlus}  />
						</div>
						<div className="text-sm">Invite user</div>
					</div>
				</button>

			</div>

			{/* <div className="flex flex-row gap-0 my-2">
				<button className="btn btn-primary">Invite user</button>
			</div> */}

			
			<div className="todo mt-2">
				<div>Roles</div>
				- <span className="underline">Account owner</span>
				<div className="pl-4">- Pays for the account.</div>
				<div className="pl-4">- Is by default also an administrator. (Can the account owner forfeit the administator role?)</div>
				<div className="pl-4">- Can always appoint administrators.</div>
				<div className="pl-4">- Can Transfer ownership of the account.</div>
				- <span className="underline">Administrator</span>
				<div className="pl-4">- Can manage users and permissions, and access all features of the system.</div>
				<div className="pl-4">- Can an administrator appoint other administrators or not?</div>
				- <span className="underline">Regular user</span>
				<div className="pl-4">- Can access the system but cannot manage users or permissions.</div>
				<br />

				How to invite someone?<br />
				- Send an invitation link to the user.<br />
				<div className="pl-4">- Copy/paste and send manually</div>
				<div className="pl-4">- By email directly from MPA?</div>
				- The invited user clicks the link and sets up their account.<br />
				- The user can then log in and access the system.<br />
				<br />
				How to set role for a user?<br />
				- The admin can make other users an administrator or a regular user, which will adjust their access to the system accordingly.<br />
				<div className="pl-4">- The account owner will always have administrator privileges and cannot be removed.</div>
				<br />
				How to delete a user?<br />
				- The admin can delete a user, which will remove their access to the system.<br />
				<div className="pl-4">- Soft delete or hard delete?</div>
			</div>
		</div>
	)
}
