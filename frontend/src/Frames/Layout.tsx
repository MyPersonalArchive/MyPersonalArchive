
import { PropsWithChildren, useState } from "react"
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtomValue } from "jotai"
import { currentUserAtom } from "../Utils/Atoms"



export const Layout = ({ children }: PropsWithChildren) => {
	const currentUser = useAtomValue(currentUserAtom)
	const [isNavOpen, setIsNavOpen] = useState(false)
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

	const toggleSubmenu = (menu: string) => {
		setOpenSubmenu(openSubmenu === menu ? null : menu)
	}

	const closeMenu = () => {
		setIsNavOpen(false)
	}

	return (
		<div className="flex flex-col lg:flex-row lg:flex-wrap min-h-screen">
			<header className="w-full bg-gray-200 text-gray-800 p-4 text-center shrink-0">
				<h1 className="text-2xl">
					My Personal Archive
				</h1>
			</header>

			<nav className="lg:w-64 bg-gray-100 relative z-1000 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
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
							<Link to={RoutePaths.Archive} onClick={closeMenu}>
								Archive
							</Link>
						</li>

						<li>
							<Link to={RoutePaths.Blobs} onClick={closeMenu}>
								Documents and media
							</Link>
						</li>

						<li>
							<Link to={RoutePaths.Email} onClick={closeMenu}>
								Email
							</Link>
						</li>

						<li>
							<button className={`toggle ${openSubmenu === "external" ? "active" : ""}`}
								onClick={() => toggleSubmenu("external")}
							>
								Connected accounts
								<Arrow subMenuIsOpen={openSubmenu === "external"} />
							</button>

							<ul className={`nav-level-2 ${openSubmenu === "external" ? "block" : "hidden"}`}>
								<li>
									<a href="#" onClick={closeMenu}>
										peter.pan@zoho.example
									</a>
								</li>
								<li>
									<a href="#" onClick={closeMenu}>
										My work mail
									</a>
								</li>
								<li>
									<a href="#" onClick={closeMenu}>
										My private mail
									</a>
								</li>
								<li>
									<a href="#" onClick={closeMenu}>
										Dropbox (private)
									</a>
								</li>
								<li>
									<a href="#" onClick={closeMenu}>
										Onedrive at work
									</a>
								</li>
							</ul>
						</li>

						<li>
							<button className={`toggle ${openSubmenu === "profile" ? "active" : ""}`}
								onClick={() => toggleSubmenu("profile")}
							>
								Profile
								<Arrow subMenuIsOpen={openSubmenu === "profile"} />
							</button>
							<ul className={`nav-level-2 ${openSubmenu === "profile" ? "block" : "hidden"}`}>
								<li>
									<Link to={RoutePaths.Profile} onClick={closeMenu}>
										My profile
									</Link>
								</li>

								<li>
									<Link to={RoutePaths.StoredFilters} onClick={closeMenu}>
										Stored filters
									</Link>
								</li>

								<li>
									<Link to={RoutePaths.SignOut} onClick={closeMenu}>
										Sign out
									</Link>
								</li>
							</ul>
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