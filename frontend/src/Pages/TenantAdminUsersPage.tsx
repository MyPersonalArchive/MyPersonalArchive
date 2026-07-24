import { faUser, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"


export const TenantAdminUsersPage = () => {

	return (
		<div className="form">
			<header className="header">
				<h1>Users and permissions</h1>
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
							<div className="text-sm">(Administrator)</div>
							<div className="text-sm">Email: peter.pan@example.com</div>
							<div className="text-sm">Last login: 2024-06-01</div>

							<div className="flex flex-col gap-2 mt-2">
								<button className="btn">Reset password</button>
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
								Tinker Bell
							</div>
							<div className="text-sm">&nbsp;</div>
							<div className="text-sm">Email: tinker.bell@example.com</div>
							<div className="text-sm">Last login: 2024-06-01</div>


							<div className="flex flex-col gap-2 mt-2">
								<button className="btn">Reset password</button>
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
								<button className="btn">Reset password</button>
								<button className="btn">Delete user</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
