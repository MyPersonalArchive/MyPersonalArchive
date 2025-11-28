import { Link, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { currentUserAtom, User } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { PropsWithChildren, useContext } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBars, faUser, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { CurrentTenantIdContext } from "./CurrentTenantIdContext"
import { Dropdown, DropdownItem } from "../Components/Dropdown"
import { StickyFooter, StickyHeader } from "../Components/Sticky"



export const Layout = ({ children }: PropsWithChildren) => {
	return (
		<>
			<StickyHeader
				className="z-10 bg-customblue text-white px-2"
				goesAway={
					<h1 className="text-3xl font-bold text-center py-2">My Personal Archive</h1>
				}
				alwaysVisible={
					<>
						<Navbar />
					</>
				}
			/>


			<main className="main">
				{children}
			</main>

			<StickyFooter
				className="z-10 bg-customblue text-white m-0"
				alwaysVisible={
					<div className="text-center py-1">
						My Personal Archive &copy; 2025 <a href="https://github.com/gotnoname" className="hover:underline">Stian Thoresen</a> & <a href="https://github.com/aeinbu" className="hover:underline">Arjan Einbu</a>
					</div>}
				goesAway={<div className="text-center text-sm py-1">
					<ul className="inline-flex space-x-4 list-disc list-inside">
						<li>
							<a href="https://github.com/MyPersonalArchive/MyPersonalArchive" target="_blank" className="hover:underline">Link to github repo</a>
						</li>
						<li>
							<a href="#" target="_blank" className="hover:underline">Link to policies</a>
						</li>
						<li>
							<a href="#" target="_blank" className="hover:underline">Other info in footer</a>
						</li>
					</ul>
				</div>}
			/>
		</>
	)
}


const Navbar = () => {
	const currentUser = useAtomValue(currentUserAtom)
	const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)

	const navigate = useNavigate()

	const switchTenant = (tenantId: number) => {
		switchToTenantId(tenantId)
		navigate(RoutePaths.Index)
	}

	return (
		currentUser
			?
			<nav className="page-header flex flex-row justify-between py-1">
				<Dropdown
					header={<>
						<FontAwesomeIcon icon={faBars} className="mr-1" />
						Pages
					</>}
					items={[
						{ type: "link", label: <>Archive</>, link: RoutePaths.Archive },
						{ type: "link", label: <>Blobs</>, link: RoutePaths.Blobs },
						{ type: "link", label: <>Filters</>, link: RoutePaths.StoredFilters },
						{ type: "link", label: <>Email</>, link: RoutePaths.Email },
					]}
				/>

				<Dropdown
					header={
						<UserProfileHeader user={currentUser} />
					}
					items={[
						{ type: "link", label: "Profile", link: RoutePaths.Profile },
						...(
							currentUser.availableTenantIds.length > 1
								? [
									{ type: "seperator" },
									...currentUser.availableTenantIds.map((tenantId) => (
										currentTenantId === tenantId
											? { type: "inactive", label: <>Tenant {tenantId}</> }
											: { type: "button", label: <>Tenant {tenantId}</>, onClick: () => { switchTenant(tenantId) } }
									))
								] as DropdownItem[]
								: []
						),
						{ type: "seperator" },
						{ type: "link", label: "Log out", link: RoutePaths.SignOut }
					]}
				/>
			</nav>
			: <nav className="navbar horizontal-evenly-spaced-flex">
				<Link to={RoutePaths.SignIn}>Sign in</Link>
			</nav >
	)
}


const UserProfileHeader = ({ user }: { user: User }) => {
	return <>
		{
			user.username === "admin@localhost"
				? <FontAwesomeIcon icon={faUserTie} className="mr-1" />
				: <FontAwesomeIcon icon={faUser} className="mr-1" />
		}
		{user.fullname}
	</>
}