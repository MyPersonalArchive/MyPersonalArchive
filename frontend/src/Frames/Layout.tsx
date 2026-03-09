
import { PropsWithChildren, useState } from "react"
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useAtomValue } from "jotai"
import { atomWithStorage } from "jotai/utils"
import { ExternalAccount, externalAccountsAtom, externalAccountsMimeTypeConverters } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSliders, faGripVertical, faTrashCan, faPlus } from "@fortawesome/free-solid-svg-icons"
import { isPreferencesOpenAtom } from "../Utils/Atoms"
import { useSortableDragDrop } from "../Components/DragDropHelpers"
import { useEmailProvidersPrefetching } from "../Utils/useEmailProvidersPrefetching"
import { emailProvidersAtom } from "../Utils/Atoms/emailProvidersAtom"
import { useRemoteAuthentication } from "../Utils/useRemoteAuthentication"


const openSubMenuAtom = atomWithStorage<string | null>("openSubMenu", null, undefined, { getOnInit: true })

export const Layout = ({ children }: PropsWithChildren) => {
	const currentUser = useAtomValue(currentUserAtom)
	const [isNavOpen, setIsNavOpen] = useState(false)
	const [isPreferencesOpen, setIsPreferencesOpen] = useAtom(isPreferencesOpenAtom)
	const [openSubmenu, setOpenSubmenu] = useAtom(openSubMenuAtom)

	const accounts = useAtomValue(externalAccountsAtom)

	const toggleSubmenu = (menu: string) => {
		setOpenSubmenu(openSubmenu === menu ? null : menu)
	}

	const closeMenu = () => {
		setIsNavOpen(false)
	}

	// const createAccount = () => {
	// 	navigate(RoutePaths.Profile)
	// }

	return (
		<div className="flex flex-col lg:flex-row lg:flex-wrap min-h-screen">
			<header className="w-full bg-gray-200 text-gray-800 p-4 shrink-0 flex items-center">
				<h1 className="text-2xl flex-1 text-center">
					My Personal Archive
				</h1>
				<button
					className={`p-1 rounded hover:bg-gray-300 transition-colors ${isPreferencesOpen ? "text-blue-600" : ""}`}
					aria-label="Toggle preferences"
					onClick={() => setIsPreferencesOpen(v => !v)}
				>
					<FontAwesomeIcon icon={faSliders} size="lg" />
				</button>
			</header>

			<nav className="lg:w-64 bg-gray-100 relative  lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
				<button
					className="lg:hidden block w-full bg-gray-200 text-gray-800 border-none p-4 text-base cursor-pointer text-left hover:bg-gray-300 transition-colors"
					aria-label="Toggle navigation"
					onClick={() => setIsNavOpen(!isNavOpen)}
				>
					☰ Menu
				</button>

				<ul className={`nav-level-1 ${isNavOpen ? "block" : "hidden"} lg:block list-none bg-gray-100 absolute lg:static top-full left-0 right-0 shadow-md lg:shadow-none`}>

					{!currentUser && <>
						<li>
							<Link to={RoutePaths.SignIn} onClick={closeMenu}>
								Sign in
							</Link>
						</li>
					</>
					}

					{currentUser && <>
						<li>
							<Link to={RoutePaths.Archive.List} onClick={closeMenu}>
								Archive
							</Link>
						</li>

						<li>
							<Link to={RoutePaths.Blob.List} onClick={closeMenu}>
								Documents and media
							</Link>
						</li>

						<li>
							<span className="heading relative">
								Connected accounts
								{
									// !isPreferencesOpen &&
									// <button className="cursor-pointer ml-2.5" onClick={() => createAccount()}>
									// 	<FontAwesomeIcon className="absolute right-3 top-1/2 transform -translate-y-1/2" icon={faPlus} />
									// </button>
								}
							</span>

							<ul className={"nav-level-2"}>
							</ul>
						</li>

						{accounts === undefined || accounts.length === 0
							? <li className="italic text-gray-500 py-2 px-4">
								No connected accounts
							</li>
							: <AccountList />
						}

						<li>
							<Link to={RoutePaths.Profile}>
								My profile
							</Link>
						</li>
					</>
					}
				</ul>
			</nav>

			<div className="flex-1 min-w-0">
				<main className="px-2 lg:px-6 py-4">
					{children}
				</main>
			</div>

			<footer className="w-full bg-gray-200 text-gray-800 text-center p-4 flex-shrink-0">
				<p>Footer</p>
			</footer>
		</div>
	)
}


type ArrowProps = {
	subMenuIsOpen: boolean
}
const Arrow = ({ subMenuIsOpen }: ArrowProps) => {
	return (
		<span className={`float-right transition-transform duration-300 inline-block text-xs ${subMenuIsOpen ? "rotate-90" : ""}`}>
			▶
		</span>
	)
}


const AccountList = () => {
	const isPreferencesOpen = useAtomValue(isPreferencesOpenAtom)

	return isPreferencesOpen
		? <EditableAccountList />
		: <ClickableAccountList />
}


const ClickableAccountList = () => {
	const accounts = useAtomValue(externalAccountsAtom)

	return (
		accounts.map(account => (
			<li key={account.id} className="flex items-center pl-4">
				<Link to={`${RoutePaths.Email}/${account.id}`} className="flex-1">
					{account.displayName}
				</Link>
			</li>
		))
	)
}


const EditableAccountList = () => {
	const [accounts, dispatch] = useAtom(externalAccountsAtom)

	const dnd = useSortableDragDrop<ExternalAccount, HTMLLIElement>(
		".draghandle",
		externalAccountsMimeTypeConverters,
		accounts,
		dispatch
	)

	return <>
		{
			dnd.rows.map(({ rowType, data: account }, index) => rowType === "item-row"
				?
				<li key={account.id}
					className="flex items-center"
					draggable={true}
					onMouseDown={dnd.mouseDown}
					onMouseUp={dnd.mouseUp}
					onDragStart={dnd.dragStart(index, account)}
					onDragOver={dnd.dragOver(index)}
					onDragEnd={dnd.dragEnd}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<div className="link w-[256px] relative">
						<span className="draghandle cursor-grab absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
							<FontAwesomeIcon icon={faGripVertical} />
						</span>
						<span className="pl-4">
							<input className=""
								type="text"
								value={account.displayName}
								onChange={e => dispatch({ action: "EDIT_ACCOUNT_DISPLAYNAME", index, displayName: e.target.value })} />
						</span>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800">
							<button className=" text-red-500 cursor-pointer ml-2.5" onClick={() => dispatch({ action: "REMOVE_ACCOUNT", index })}>
								<FontAwesomeIcon icon={faTrashCan} size="1x" />
							</button>
						</span>
					</div>
				</li>
				: <li key={account.id}
					className="flex items-center h-[49px] striped-background"
					onDragEnd={dnd.dragEnd}
					onDragOver={e => e.preventDefault()}
					onDrop={dnd.handleDrop(index)}
					ref={elmnt => { dnd.setElementRef(elmnt, index) }}
				>
					<div className="link striped-background">
					</div>
				</li>
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
		<li className="flex items-center">
			<div className="link w-[256px] relative">
				<select
					className="input w-44 ml-4"
					value={getSelectedEmailProvider()?.lookup || undefined}
					onChange={e => setSelectedEmailProvider(availableEmailProviders.find(p => p.lookup === e.target.value))}
				>
					<option>-- Add account --</option>
					{availableEmailProviders.map(p =>
						<option key={p.lookup} value={p.lookup}>{p.displayName}</option>
					)}
				</select>

				<span className="absolute right-3 top-1/2 -translate-y-1/2">
					<button className="cursor-pointer ml-2.5"
						onClick={() => login(getSelectedEmailProvider()!.provider, getSelectedEmailProvider()!.authType, window.location.origin + "/email")}
						disabled={getSelectedEmailProvider() === null}
					>
						<FontAwesomeIcon icon={faPlus} />
					</button>
				</span>
			</div>
		</li>
	)
}