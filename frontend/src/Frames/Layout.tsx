import './Layout.css'
import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { loggedInUserAtom } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { PropsWithChildren } from "react"
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
// import { faBars } from '@fortawesome/free-solid-svg-icons'



export const Layout = ({ children }: PropsWithChildren) => {
    const loggedInUser = useAtomValue(loggedInUserAtom)

    return (
        <>
            <div className="layout-container">
                <header className="header horizontal-evenly-spaced-flex">
                    <div>
                        {/* <FontAwesomeIcon icon={faBars} /> */}
                        &nbsp;
                        {
                            loggedInUser && <Link to={RoutePaths.Archive}>Archive</Link>
                        }
                    </div>
                    <div>
                        {
                            loggedInUser
                                ? <Link to={RoutePaths.SignOut}>Log out {loggedInUser.fullname}</Link>
                                : <Link to={RoutePaths.SignIn}>Sign in</Link>
                        }
                    </div>
                </header>

                <main className="main">
                    {children}
                </main>

                <footer className="footer">
                    &copy; 2025 Stian Thoresen & Arjan Einbu
                </footer>
            </div>
        </>
    )
}