import { Link, useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { loggedInUserAtom, User } from "../Utils/Atoms"
import { useAtomValue } from "jotai"
import { PropsWithChildren, useContext } from "react"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBars, faCaretDown, faUser, faUserTie } from '@fortawesome/free-solid-svg-icons'
import { CurrentTenantIdContext } from './CurrentTenantIdFrame'
import { Dropdown, DropdownItem } from "./Dropdown"



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
    const { currentTenantId, switchToTenantId } = useContext(CurrentTenantIdContext)

    const navigate = useNavigate()

    const switchTenant = (tenantId: number) => {
        switchToTenantId(tenantId)
        navigate(RoutePaths.Index)
    }

    return (
        loggedInUser
            ?
            <nav className="navbar horizontal-evenly-spaced-flex">
                <Dropdown
                    header={<>
                        <FontAwesomeIcon icon={faBars} />
                        <span className="spacer-1ex" />
                        Pages
                    </>}
                    items={[
                        { type: "link", label: "Archive", link: RoutePaths.Archive },
                        { type: "link", label: "Unallocated blobs", link: RoutePaths.Blobs }
                    ]}
                />

                <Dropdown
                    header={
                        <UserProfileHeader user={loggedInUser} />
                    }
                    items={[
                        { type: "link", label: "Profile", link: RoutePaths.Profile },
                        ...(
                            loggedInUser.availableTenantIds.length > 1
                                ? [
                                    { type: "seperator" },
                                    ...loggedInUser.availableTenantIds.map((tenantId) => (
                                        currentTenantId === tenantId
                                            ? { type: "inactive", label: `Tenant ${tenantId}` }
                                            : { type: "button", label: `Tenant ${tenantId}`, onClick: () => { switchTenant(tenantId) }}
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
                ? <FontAwesomeIcon icon={faUserTie} />
                : <FontAwesomeIcon icon={faUser} />
        }
        <span className="spacer-1ex" />
        {user.fullname}
    </>
}