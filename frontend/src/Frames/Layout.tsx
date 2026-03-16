
import { PropsWithChildren, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { ExternalAccount, externalAccountsAtom, externalAccountsMimeTypeConverters } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan, faPlus, faUser, faBars, faChevronDown, faRightFromBracket, faBoxArchive, faPhotoFilm, faSliders, faEnvelope, faGripHorizontal, faToggleOff, faToggleOn, faGear } from "@fortawesome/free-solid-svg-icons"
import { useSortableDragDrop } from "../Components/DragDropHelpers"
import { useEmailProvidersPrefetching } from "../Utils/Hooks/useEmailProvidersPrefetching"
import { emailProvidersAtom } from "../Utils/Atoms/emailProvidersAtom"
import { useRemoteAuthentication } from "../Utils/Hooks/useRemoteAuthentication"
import classNames from "classnames"
import { layoutStateAtom } from "../Utils/Atoms/layoutStateAtom"



export const Layout = ({ children }: PropsWithChildren) => {
	const currentUser = useAtomValue(currentUserAtom)
	const [{ navIsOpen, profileDropdownIsOpen, preferencesIsOpen }, dispatchLayoutCommand] = useAtom(layoutStateAtom)

	return (
		<>
			<header id="topHeader">
				<button className="menu-btn" id="menuBtn"
					aria-label="Open navigation"
					aria-expanded={navIsOpen}
					aria-controls="sideNav"
					onClick={() => dispatchLayoutCommand({ action: "TOGGLE_NAV" })}
				>
					<FontAwesomeIcon icon={faBars} />
				</button>

				<span className="logo">My Personal Archive</span>

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
						</Link>
					}
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
								{currentUser?.fullname}
								<FontAwesomeIcon icon={faChevronDown} />
							</button>

							<div className={classNames("profile-dropdown", { "open": profileDropdownIsOpen })}
								role="menu"
								id="profileDropdown"
							>
								<div className="profile-dropdown-header">
									<strong>{currentUser?.fullname}</strong>
									<span>{currentUser?.username}</span>
								</div>
								<Link role="menuitem"
									to={RoutePaths.Profile}
									onClick={() => dispatchLayoutCommand({ action: "CLOSE_PROFILE_DROPDOWN" })}
								>
									<FontAwesomeIcon icon={faUser} />
									My profile
								</Link>
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
						</>
					}
				</div>
			</header>

			<div className={classNames("nav-overlay", { "open": navIsOpen })}></div>

			<nav id="sideNav" className={classNames({ "open": navIsOpen })}>
				{currentUser &&
					<>
						<div className="nav-group">
							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.Archive.List} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faBoxArchive} fixedWidth />
								Archive
							</NavLink>
							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.Blob.List} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faPhotoFilm} fixedWidth />
								Documents and media
							</NavLink>
						</div>

						<div className="nav-group">
							<span className="nav-group-heading">Connected accounts</span>
							<AccountList />
						</div>

						<div className="flex-1">
							<span className="nav-group-heading">Upload</span>
							<div className="border border-gray-400 h-80 rounded m-4 p-4">
								Suggested new drop area
							</div>
						</div>

						<div className="nav-group">
							<NavLink
								className={classNames("nav-link", { "bg-white/12 border-l-red-500 text-white": preferencesIsOpen })}
								to={RoutePaths.Settings}
								onClick={() => dispatchLayoutCommand({ action: "TOGGLE_PREFERENCES" })}
							>
								<FontAwesomeIcon icon={faGear} fixedWidth />
								Settings
							</NavLink>

							<button
								className={classNames("nav-link", { "bg-white/12 border-l-red-500 text-white": preferencesIsOpen })}
								onClick={() => dispatchLayoutCommand({ action: "TOGGLE_PREFERENCES" })}
							>
								<FontAwesomeIcon icon={faSliders} fixedWidth />
								Adjustments mode
								<div className="flex-1"></div>
								<FontAwesomeIcon icon={preferencesIsOpen ? faToggleOn : faToggleOff} fixedWidth />
							</button>
						</div>
					</>
				}
			</nav>

			<main className="p-4! pt-2">
				{children}
			</main>

		</>
	)
}



const AccountList = () => {
	const { preferencesIsOpen } = useAtomValue(layoutStateAtom)

	return preferencesIsOpen
		? <EditableAccountList />
		: <ClickableAccountList />
}


const ClickableAccountList = () => {
	const dispatchLayoutCommand = useSetAtom(layoutStateAtom)
	const accounts = useAtomValue(externalAccountsAtom)

	return <>
		{accounts.map(account => (
			<NavLink key={account.id}
				className={({ isActive }) => isActive ? "active" : undefined}
				to={`${RoutePaths.Email}/${account.id}`}
				onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
			>
				<FontAwesomeIcon icon={faEnvelope} fixedWidth />
				{account.displayName}
			</NavLink>
		))}

		<div className="h-12"></div>
	</>
}


const EditableAccountList = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)
	const navigate = useNavigate()
	const location = useLocation()

	const dnd = useSortableDragDrop<ExternalAccount, HTMLDivElement>(
		".draghandle",
		externalAccountsMimeTypeConverters,
		accounts,
		dispatch
	)

	return <>
		{
			dnd.rows.map(({ rowType, data: account }, index) => rowType === "item-row"
				?
				<div key={account.id}
					className={classNames("nav-link group", {"active": location.pathname === `${RoutePaths.Email}/${account.id}`})}
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, account)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<span className="draghandle cursor-grab text-gray-400 group-hover:text-white">
						<FontAwesomeIcon icon={faGripHorizontal} fixedWidth />
					</span>
					<span className="">
						<input className="text-inherit"
							type="text"
							onFocus={() => navigate(`${RoutePaths.Email}/${account.id}`)}
							value={account.displayName}
							onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", id: account.id, displayName: e.target.value })} />
					</span>
					<div className="flex-1"></div>
					<button className=" text-gray-400 group-hover:text-red-500 cursor-pointer ml-2.5" onClick={() => dispatch({ action: "REMOVE_ACCOUNT", id: account.id })}>
						<FontAwesomeIcon icon={faTrashCan} fixedWidth />
					</button>
				</div>
				: <div key={account.id}
					className="h-9.75 striped-background"
					onDragEnd={dnd.dragEnd}
					onDragOver={e => e.preventDefault()}
					onDrop={dnd.handleDrop(index)}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<div className="link striped-background">
					</div>
				</div>
			)
		}
		<ConnectNewAccount />
	</>
}




type EmailProviderOption = {
	provider: string,
	lookup: string,
	displayName: string,
	authType: string
}


export const ConnectNewAccount = () => {
	useEmailProvidersPrefetching()
	const availableEmailProviders = useAtomValue(emailProvidersAtom).flatMap(p => p.authTypes.map(authType => ({
		provider: p.provider,
		lookup: `${p.provider}+${authType}`,
		displayName: `${p.displayName} (${authType})`,
		authType: authType
	})))

	const [selectedEmailProvider, setSelectedEmailProvider] = useState<EmailProviderOption | undefined>(undefined)
	const { login } = useRemoteAuthentication()

	return (
		<div className="nav-link">
			<select
				className="input w-44 text-inherit border-gray-400!"
				value={selectedEmailProvider?.lookup}
				onChange={e => setSelectedEmailProvider(availableEmailProviders.find(p => p.lookup === e.target.value))}
			>
				<option>-- Add account --</option>
				{availableEmailProviders.map(p =>
					<option key={p.lookup} value={p.lookup}>{p.displayName}</option>
				)}
			</select>
			<div className="flex-1"></div>
			<button className="cursor-pointer text-white"
				onClick={() => login(selectedEmailProvider!.provider, selectedEmailProvider!.authType, window.location.origin + "/email")}
				disabled={selectedEmailProvider === undefined}
			>
				<FontAwesomeIcon icon={faPlus} fixedWidth />
			</button>
		</div>

	)
}