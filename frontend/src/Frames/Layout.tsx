import { Link, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { loggedInUserAtom, User } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { PropsWithChildren, useContext } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faCaretDown, faUser, faUserTie } from '@fortawesome/free-solid-svg-icons'
import { CurrentTenantIdContext } from './CurrentTenantIdFrame'



export const Layout = ({ children }: PropsWithChildren) => {
    return (
        <>
            <div className="layout-container">

                <Navbar />

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


const Navbar = () => {
    const loggedInUser = useAtomValue(loggedInUserAtom)
    const {currentTenantId, switchToTenantId} = useContext(CurrentTenantIdContext)
    
    const navigate = useNavigate()

    const switchTenant = (tenantId: number) => {
        switchToTenantId(tenantId)
        navigate(RoutePaths.Index)
    }

    return (
        <nav className="navbar horizontal-evenly-spaced-flex">
            <div className="dropdown dropdown-left-aligned">
                <a>
                    <FontAwesomeIcon icon={faBars} />
                </a>
                <div className="dropdown-content">
                    <Link to={RoutePaths.Archive}>Archive</Link>
                    <Link to={RoutePaths.Blobs}>Blobs</Link>
                </div>
            </div>
            {
                loggedInUser
                    ? <div className="dropdown dropdown-right-aligned">
                        <a className="dropbtn">
                            <UserProfileHeader user={loggedInUser} />
                            <FontAwesomeIcon icon={faCaretDown} className="dimmed" />
                        </a>
                        <div className="dropdown-content">
                            <Link to={RoutePaths.Profile}>Profile</Link>
                            <div className="horizontal-line"></div>
                            {
                                loggedInUser.availableTenantIds.length > 1 &&
                                <>
                                    <p>Switch tenant:</p>
                                    {
                                        loggedInUser.availableTenantIds
                                            .map(tenantId => (
                                                tenantId === currentTenantId
                                                    ? <p key={tenantId} >{tenantId}</p>
                                                    : <button key={tenantId} onClick={() => switchTenant(tenantId)}>{tenantId}</button>
                                            ))
                                    }
                                    <div className="horizontal-line"></div>
                                </>
                            }
                            <Link to={RoutePaths.SignOut}>Log out</Link>
                        </div>
                    </div>
                    : <Link to={RoutePaths.SignIn}>Sign in</Link>
            }
        </nav>
    )
}


const UserProfileHeader = ({user} : {user: User}) => {
    return <>
        {
            user.username === "admin@localhost"
                ? <FontAwesomeIcon icon={faUserTie} />
                : <FontAwesomeIcon icon={faUser} />
        }
        <span style={{ width: ".5em", display: "inline-block" }}></span>
        {user.fullname}
        <span className="spacer-1ex" />

    </>
}