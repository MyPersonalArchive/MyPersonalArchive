
import { PropsWithChildren, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { ExternalAccount, externalAccountsAtom, externalAccountsMimeTypeConverters } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGripVertical, faTrashCan, faPlus, faUser, faBars, faChevronDown, faRightFromBracket, faBoxArchive, faPhotoFilm, faSlidersH, faSliders, faGear } from "@fortawesome/free-solid-svg-icons"
import { useSortableDragDrop } from "../Components/DragDropHelpers"
import { useEmailProvidersPrefetching } from "../Utils/Hooks/useEmailProvidersPrefetching"
import { emailProvidersAtom } from "../Utils/Atoms/emailProvidersAtom"
import { useRemoteAuthentication } from "../Utils/Hooks/useRemoteAuthentication"
import classNames from "classnames"
import { layoutStateAtom } from "../Utils/Atoms/layoutStateAtom"



export const Layout = ({ children }: PropsWithChildren) => {
	const currentUser = useAtomValue(currentUserAtom)
	const [{navIsOpen, profileDropdownIsOpen, preferencesIsOpen}, dispatchLayoutCommand] = useAtom(layoutStateAtom)

	return (
		<>
			<header id="topHeader">
				<button className="menu-btn" id="menuBtn"
					aria-label="Open navigation"
					aria-expanded={navIsOpen}
					aria-controls="sideNav"
					onClick={() => dispatchLayoutCommand({ action: "TOGGLE_NAV"})}
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
							<span className="nav-group-heading">General</span>
							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.Archive.List} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV"})}
							>
								<FontAwesomeIcon icon={faBoxArchive} />
								Archive
							</NavLink>
							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.Blob.List} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV"})}
							>
								<FontAwesomeIcon icon={faPhotoFilm} />
								Documents and media
							</NavLink>
						</div>

						<div className="nav-group">
							<span className="nav-group-heading">Connected accounts</span>
							<AccountList />
						</div>

						<div className="flex-1"></div>

						<div className="nav-group">
							{/* <span className="nav-group-heading">General</span> */}
							<button className={classNames("nav-link", { "active": preferencesIsOpen })}
								onClick={() => dispatchLayoutCommand({ action: "TOGGLE_PREFERENCES" })}
							>
								<FontAwesomeIcon icon={faSliders} />
								Preferences
							</button>
						</div>
					</>
				}
			</nav>

			<main id="mainArea">
				<main className="px-2 lg:px-6 py-4">
					{children}
				</main>
			</main>

		</>
	)
}



const AccountList = () => {
	const {preferencesIsOpen} = useAtomValue(layoutStateAtom)

	return preferencesIsOpen
		? <EditableAccountList />
		: <ClickableAccountList />
}


const ClickableAccountList = () => {
	const dispatchLayoutCommand = useSetAtom(layoutStateAtom)
	const accounts = useAtomValue(externalAccountsAtom)

	return (
		accounts.map(account => (
			<NavLink key={account.id}
				className={({ isActive }) => isActive ? "active" : undefined}
				to={`${RoutePaths.Email}/${account.id}`}
				onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
			>
				{account.displayName}
			</NavLink>
		))
	)
}


const EditableAccountList = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)

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
					className="nav-link"
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, account)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<div className="link w-[256px] relative">
						<span className="draghandle cursor-grab absolute -left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
							<FontAwesomeIcon icon={faGripVertical} />
						</span>
						<span className="">
							<input className="text-white"
								type="text"
								value={account.displayName}
								onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", id: account.id, displayName: e.target.value })} />
						</span>
						<span className="absolute -right-2 top-1/2 -translate-y-1/2 text-gray-800">
							<button className=" text-red-500 cursor-pointer ml-2.5" onClick={() => dispatch({ action: "REMOVE_ACCOUNT", id: account.id })}>
								<FontAwesomeIcon icon={faTrashCan} size="1x" />
							</button>
						</span>
					</div>
				</div>
				: <div key={account.id}
					className="flex items-center h-[49px] striped-background"
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

	const getSelectedEmailProvider = () => {
		return selectedEmailProvider ?? null
	}


	return (
		<div className="flex items-center">
			<div className="link w-[256px] relative">
				<select
					className="input w-44 ml-4 text-white"
					value={getSelectedEmailProvider()?.lookup}
					onChange={e => setSelectedEmailProvider(availableEmailProviders.find(p => p.lookup === e.target.value))}
				>
					<option>-- Add account --</option>
					{availableEmailProviders.map(p =>
						<option key={p.lookup} value={p.lookup}>{p.displayName}</option>
					)}
				</select>

				<span className="absolute right-2 top-1/2 -translate-y-1/2">
					<button className="cursor-pointer text-white"
						onClick={() => login(getSelectedEmailProvider()!.provider, getSelectedEmailProvider()!.authType, window.location.origin + "/email")}
						disabled={getSelectedEmailProvider() === null}
					>
						<FontAwesomeIcon icon={faPlus} />
					</button>
				</span>
			</div>
		</div>
	)
}