import { faUser, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"


export const TenantAdminUsersPage = () => {

	return (
		<div className="form">
			<header className="header">
				<h1>Users and permissions</h1>
				<div className="todo mt-2">
					//TODO: Implement this, since this is a placeholder/sample page
				</div>

			</header>

			<div className="flex flex-row gap-0 my-2">
				{/* <div className="flex-1"></div> */}
				<button className="btn btn-primary">Invite user</button>
			</div>

			<div className="flex gap-3 flex-wrap">
				<div className="card flex flex-row relative w-73">
					<div className="p-2 grow">
						<div className="flex flex-col py-2 px-4">
							<div className="font-bold">
								<FontAwesomeIcon icon={faUserTie} fixedWidth />
								Peter Pan
							</div>
							<div className="text-sm">(Account owner)</div>
							<div className="text-sm">Email: peter.pan@example.com</div>
							<div className="text-sm">Last login: 2024-06-01</div>

							<div className="flex flex-col gap-2 mt-2">
								<button className="btn">Delete user</button>
							</div>
						</div>
					</div>
				</div>

				<div className="card flex flex-row relative w-73">
					<div className="p-2 grow">
						<div className="flex flex-col py-2 px-4">
							<div className="font-bold">
								<FontAwesomeIcon icon={faUserTie} fixedWidth />
								Tinker Bell
							</div>
							<div className="text-sm">(Administrator)</div>
							<div className="text-sm">Email: tinker.bell@example.com</div>
							<div className="text-sm">Last login: 2024-06-01</div>


							<div className="flex flex-col gap-2 mt-2">
								<button className="btn">Delete user</button>
							</div>
						</div>
					</div>
				</div>

				<div className="card flex flex-row relative w-73">
					<div className="p-2 grow">
						<div className="flex flex-col py-2 px-4">
							<div className="font-bold">
								<FontAwesomeIcon icon={faUser} fixedWidth />
								Captain Hook
							</div>
							<div className="text-sm">&nbsp;</div>
							<div className="text-sm">Email: captain.hook@example.com</div>
							<div className="text-sm">Last login: 2024-06-01</div>


							<div className="flex flex-col gap-2 mt-2">
								<button className="btn">Delete user</button>
							</div>
						</div>
					</div>
				</div>
			</div>

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
