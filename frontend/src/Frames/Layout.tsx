
import { PropsWithChildren, useState } from "react"
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"



export const Layout = ({ children }: PropsWithChildren) => {
	const [isNavOpen, setIsNavOpen] = useState(false)
	const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

	const toggleSubmenu = (menu: string) => {
		setOpenSubmenu(openSubmenu === menu ? null : menu)
	}




	return (
		<div className="flex flex-col lg:flex-row lg:flex-wrap min-h-screen">
			<header className="w-full bg-gray-200 text-gray-800 p-4 text-center shrink-0">
				<h1 className="text-2xl">Responsive layout playground</h1>
			</header>

			<nav className="lg:w-64 bg-gray-100 relative z-1000 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
				<button
					className="lg:hidden block w-full bg-gray-200 text-gray-800 border-none p-4 text-base cursor-pointer text-left hover:bg-gray-300 transition-colors"
					aria-label="Toggle navigation"
					onClick={() => setIsNavOpen(!isNavOpen)}
				>
					☰ Menu
				</button>

				{/* //TODO: make this links
						{ type: "link", label: <>Archive</>, link: RoutePaths.Archive },
						{ type: "link", label: <>Blobs</>, link: RoutePaths.Blobs },
						{ type: "link", label: <>Filters</>, link: RoutePaths.StoredFilters },
						{ type: "link", label: <>Emails</>, link: RoutePaths.Email },
						 */}

				<ul className={`${isNavOpen ? "block" : "hidden"} lg:block list-none bg-gray-100 absolute lg:static top-full left-0 right-0 shadow-md lg:shadow-none`}>

					<li className="nav-level-1">
						<Link className="link" to={RoutePaths.Archive}>
							Archive
						</Link>
					</li>

					<li className="nav-level-1">
						<Link className="link" to={RoutePaths.Blobs}>
							Documents and media
						</Link>
					</li>

					<li className="nav-level-1">
						<Link className="link" to={RoutePaths.Email}>
							Email
						</Link>
					</li>

					<li className="nav-level-1">
						<button className={`toggle ${openSubmenu === "external" ? "active" : ""}`}
							onClick={() => toggleSubmenu("external")}
						>
							External
							<Arrow subMenuIsOpen={openSubmenu === "external"} />
						</button>

						<ul className={`${openSubmenu === "external" ? "block" : "hidden"} list-none bg-gray-200`}>
							<li className="nav-level-2">
								<a className="link" href="#">
									my.name@example.com
								</a>
							</li>
							<li className="nav-level-2">
								<a className="link" href="#">
									other.email@example.com
								</a>
							</li>
							<li className="nav-level-2">
								<a className="link" href="#">
									Dropbox (my.name@example.com)
								</a>
							</li>
							<li className="nav-level-2">
								<a className="link" href="#">
									Manage external sources
								</a>
							</li>
						</ul>
					</li>

					<li className="nav-level-1">
						<button className={`toggle ${openSubmenu === "profile" ? "active" : ""}`}
							onClick={() => toggleSubmenu("profile")}
						>
							Profile
							<Arrow subMenuIsOpen={openSubmenu === "profile"} />
						</button>
						<ul className={`${openSubmenu === "profile" ? "block" : "hidden"} list-none bg-gray-200`}>
							<li className="nav-level-2">
								<Link className="link" to={RoutePaths.Profile}>
									My profile
								</Link>
							</li>

							<li className="nav-level-2">
								<Link className="link" to={RoutePaths.StoredFilters}>
									Stored filters
								</Link>
							</li>

							<li className="nav-level-2">
								<Link className="link" to={RoutePaths.SignOut}>
									Sign out
								</Link>
							</li>
						</ul>
					</li>
				</ul>
			</nav>

			<div className="flex-1 min-w-0">
				<main>
					{children}
				</main>
			</div>

			<footer className="w-full bg-gray-200 text-gray-800 text-center p-4 mt-auto flex-shrink-0">
				<p>Footer</p>
			</footer>
		</div>
	)
}


type ArrowProps = {
	subMenuIsOpen: boolean
}
const Arrow = ({subMenuIsOpen}: ArrowProps) => {
	return (
		<span className={`float-right transition-transform duration-300 inline-block text-xs ${subMenuIsOpen ? "rotate-90" : ""}`}>
			▶
		</span>
	)
}