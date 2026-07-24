
import { PropsWithChildren, useEffect, useRef, useState } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { ExternalAccount, externalAccountsAtom, externalAccountsMimeTypeConverters } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTrashCan, faPlus, faBoxArchive, faPhotoFilm, faSliders, faEnvelope, faGripHorizontal, faToggleOff, faToggleOn, faGear } from "@fortawesome/free-solid-svg-icons"
import { useSortableDragDrop } from "../Components/DragDropHelpers"
import { useEmailProvidersPrefetching } from "../Utils/Hooks/useEmailProvidersPrefetching"
import { emailProvidersAtom } from "../Utils/Atoms/emailProvidersAtom"
import { useRemoteAuthentication } from "../Utils/Hooks/useRemoteAuthentication"
import classNames from "classnames"
import { layoutStateAtom } from "../Utils/Atoms/layoutStateAtom"
import { FileDrop } from "../Components/FileDrop"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { TopBar } from "./TopBar"



export const UserLayout = ({ children }: PropsWithChildren) => {
	const currentUser = useAtomValue(currentUserAtom)
	const [{ navIsOpen, profileDropdownIsOpen, adjustmentsModeIsOpen }, dispatchLayoutCommand] = useAtom(layoutStateAtom)

	const externalAccounts = useAtomValue(externalAccountsAtom)

	const apiClient = useApiClient()
	const previousAdjustmentsModeIsOpen = useRef(adjustmentsModeIsOpen)
	useEffect(() => {
		if (previousAdjustmentsModeIsOpen.current && !adjustmentsModeIsOpen) {
			apiClient.execute("SaveExternalAccounts", {
				externalAccounts
			})
		}
		previousAdjustmentsModeIsOpen.current = adjustmentsModeIsOpen
	}, [adjustmentsModeIsOpen])

	return (
		<>
			<TopBar className="user-layout"
				navIsOpen={navIsOpen}
				dispatchLayoutCommand={dispatchLayoutCommand}
				currentUser={currentUser}
				profileDropdownIsOpen={profileDropdownIsOpen}
			/>

			<div className={classNames("nav-overlay", { "open": navIsOpen })}
				onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
				aria-hidden={!navIsOpen}
			>
			</div>

			<nav id="sideNav" className={classNames("user-layout", { "open": navIsOpen })}>
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

						<FileDrop className="flex-1 border border-gray-400 rounded-lg m-4 p-4 flex flex-col items-center justify-center hover:bg-white/12">
							<span>Drop files here</span>
							<span>or</span>
							<span>click to select files</span>
						</FileDrop>

						<div className="nav-group">
							<button
								className={classNames("adjustments-mode-toggle", { "active": adjustmentsModeIsOpen })}
								onClick={() => dispatchLayoutCommand({ action: "TOGGLE_ADJUSTMENTS_MODE" })}
							>
								<FontAwesomeIcon icon={faSliders} fixedWidth />
								Adjustments mode
								<div className="flex-1"></div>
								<FontAwesomeIcon icon={adjustmentsModeIsOpen ? faToggleOn : faToggleOff} fixedWidth />
							</button>
						</div>
					</>
				}
			</nav>

			<div id="mainArea">
				<main>
					{children}
				</main>
			</div>
		</>
	)
}



const AccountList = () => {
	const { adjustmentsModeIsOpen } = useAtomValue(layoutStateAtom)

	return adjustmentsModeIsOpen
		? <EditableAccountList />
		: <ClickableAccountList />
}


const ClickableAccountList = () => {
	const dispatchLayoutCommand = useSetAtom(layoutStateAtom)
	const externalAccounts = useAtomValue(externalAccountsAtom)

	return <>
		{externalAccounts.map(account => (
			<NavLink key={account.id}
				className={({ isActive }) => isActive ? "active" : undefined}
				to={`${RoutePaths.Email}/${account.id}`}
				onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
			>
				<FontAwesomeIcon icon={faEnvelope} fixedWidth />
				{account.displayName}
			</NavLink>
		))}

		{/* <div className="h-12"></div> */}
	</>
}


const EditableAccountList = () => {
	const [externalAccounts, dispatch] = useAtom(externalAccountsAtom)
	const navigate = useNavigate()
	const location = useLocation()

	const dnd = useSortableDragDrop<ExternalAccount, HTMLDivElement>(
		".draghandle",
		externalAccountsMimeTypeConverters,
		externalAccounts,
		dispatch
	)

	return <>
		{
			dnd.rows.map(({ rowType, data: account }, index) => rowType === "item-row"
				?
				<div key={account.id}
					className={classNames("nav-link group", { "active": location.pathname === `${RoutePaths.Email}/${account.id}` })}
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
							onFocus={(e) => { navigate(`${RoutePaths.Email}/${account.id}`); e.target.select() }}
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

