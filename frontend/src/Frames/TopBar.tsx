
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { User } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser, faBars, faChevronDown, faRightFromBracket } from "@fortawesome/free-solid-svg-icons"
import classNames from "classnames"



type TopBarProps = {
	className?: string,
	title?: string
	navIsOpen: boolean,
	dispatchLayoutCommand: (args_0: { action: "TOGGLE_NAV" } | { action: "CLOSE_NAV" } | { action: "TOGGLE_PROFILE_DROPDOWN" } | { action: "CLOSE_PROFILE_DROPDOWN" } | { action: "TOGGLE_ADJUSTMENTS_MODE" }) => void,
	currentUser: User | undefined,
	profileDropdownIsOpen: boolean,
}
export const TopBar = ({ className, title, navIsOpen, dispatchLayoutCommand, currentUser, profileDropdownIsOpen }: TopBarProps) => {
	return <div id="topBar" className={className}>
		<button className="menu-btn" id="menuBtn"
			aria-label="Open navigation"
			aria-expanded={navIsOpen}
			aria-controls="sideNav"
			onClick={() => dispatchLayoutCommand({ action: "TOGGLE_NAV" })}
		>
			<FontAwesomeIcon icon={faBars} />
		</button>

		<span className="logo hidden sm:inline">
			My Personal Archive {title && ` - ${title}`}
		</span>
		<span className="logo sm:hidden">
			{title ?? "MPA"}
		</span>

		<div className="flex-1"></div>

		<div className="profile">

			{!currentUser &&
				<Link className="profile-btn"
					id="profileBtn"
					to={RoutePaths.SignIn}
				>
					<div className="profile-avatar">
						<FontAwesomeIcon icon={faUser} />
					</div>
					Sign in
				</Link>}
			{currentUser &&
				<>
					<button className="profile-btn"
						// id="profileBtn"
						aria-haspopup="true"
						aria-expanded={profileDropdownIsOpen}
						aria-controls="profileDropdown"
						onClick={() => dispatchLayoutCommand({ action: "TOGGLE_PROFILE_DROPDOWN" })}
					>
						<div className="profile-avatar">
							<FontAwesomeIcon icon={faUser} />
						</div>
						{currentUser?.fullname.split(" ", 1)}

						<FontAwesomeIcon icon={faChevronDown} />
					</button>

					<div className={classNames("profile-dropdown", { "open": profileDropdownIsOpen })}
						role="menu"
						id="profileDropdown"
					>
						<div className="profile-dropdown-header">
							<strong title={currentUser?.username}>{currentUser?.fullname}</strong>
							<span>{currentUser?.tenantId}</span>
						</div>
						<Link role="menuitem"
							to={RoutePaths.Profile}
							onClick={() => dispatchLayoutCommand({ action: "CLOSE_PROFILE_DROPDOWN" })}
						>
							<FontAwesomeIcon icon={faUser} />
							My profile
						</Link>

						{(currentUser.roles.has("Owner") || currentUser.roles.has("Administrator")) &&
							<Link role="menuitem"
								to={RoutePaths.TenantAdmin.Dashboard}
								onClick={() => dispatchLayoutCommand({ action: "CLOSE_PROFILE_DROPDOWN" })}
							>
								{/* <FontAwesomeIcon icon={faUser} /> */}
								<span className="w-3"></span>
								Manage tenant
							</Link>
						}

						<div className="divider"></div>
						<Link
							to={RoutePaths.SignOut} role="menuitem"
							onClick={() => dispatchLayoutCommand({ action: "CLOSE_PROFILE_DROPDOWN" })}
							className="danger"
						>
							<FontAwesomeIcon icon={faRightFromBracket} />
							Sign Out
						</Link>
					</div>
				</>}
		</div>
	</div>
}
