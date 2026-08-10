
import { PropsWithChildren, useEffect, useRef } from "react"
import { NavLink } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useAtom, useAtomValue } from "jotai"
import { externalAccountsAtom } from "../Utils/Atoms/externalAccountsAtom"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSliders, faToggleOff, faToggleOn, faCircleLeft, faTachographDigital, faCloud, faUserGroup, faBarsStaggered, faCreditCard } from "@fortawesome/free-solid-svg-icons"
import classNames from "classnames"
import { layoutStateAtom } from "../Utils/Atoms/layoutStateAtom"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { TopBar } from "./TopBar"



export const TenantAdminLayout = ({ children }: PropsWithChildren) => {
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
			<TopBar className="tenant-admin-layout"
				title="Manage tenant"
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

			<nav id="sideNav" className={classNames("tenant-admin-layout", { "open": navIsOpen })}>
				{currentUser &&
					<>
						<div className="nav-group">
							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.Archive.List} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faCircleLeft} fixedWidth />
								Back to archive
							</NavLink>
						</div>

						<div className="nav-group">
							<span className="nav-group-heading">Manage tenant</span>

							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.TenantAdmin.Dashboard} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faTachographDigital} fixedWidth />
								Admin dashboard
							</NavLink>

							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.TenantAdmin.Users} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faUserGroup} fixedWidth />
								Users and permissions
							</NavLink>

							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.TenantAdmin.Backup}
							>
								<FontAwesomeIcon icon={faCloud} fixedWidth />
								Backup and external sync
							</NavLink>

							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.TenantAdmin.Billing} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faCreditCard} fixedWidth />
								Subscription and billing
							</NavLink>

							<NavLink className={({ isActive }) => isActive ? "active" : undefined}
								to={RoutePaths.TenantAdmin.Logs} onClick={() => dispatchLayoutCommand({ action: "CLOSE_NAV" })}
							>
								<FontAwesomeIcon icon={faBarsStaggered} fixedWidth />
								Logs
							</NavLink>

						</div>

						<div className="flex-1">
						</div>

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
