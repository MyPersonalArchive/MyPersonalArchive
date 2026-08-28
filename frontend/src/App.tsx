import { SignInPage } from "./Pages/SignInPage"
import { useEffect } from "react"
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"
import { RoutePaths } from "./RoutePaths"
import { SignOutPage } from "./Pages/SignOutPage"
import { ArchiveItemListPage } from "./Pages/ArchiveItemListPage"
import { IndexPage } from "./Pages/IndexPage"
import { ArchiveItemEditPage } from "./Pages/ArchiveItemEditPage"
import { ArchiveItemNewPage } from "./Pages/ArchiveItemNewPage"
import { PrefetchDataFrame } from "./Frames/PrefetchDataFrame"
import { UserLayout } from "./Frames/UserLayout"
import { BlobListPage } from "./Pages/BlobListPage"
import { UserProfilePage } from "./Pages/UserProfilePage"
import { RootFrame } from "./Frames/RootFrame"
import { EmailListPage } from "./Pages/EmailListPage"
import { BasicAuthenticationPage } from "./Pages/BasicAuthenticationPage"
import { ComponentTestPage } from "./Pages/ComponentTestPage"
import { TenantAdminLayout } from "./Frames/TenantAdminLayout"
import { TenantAdminDashboardPage } from "./Pages/TenantAdminDashboardPage"
import { TenantAdminBillingPage } from "./Pages/TenantAdminBillingPage"
import { TenantAdminUsersPage } from "./Pages/TenantAdminUsersPage"
import { TenantAdminBackupPage } from "./Pages/TenantAdminBackupPage"
import { TenantAdminLogsPage } from "./Pages/TenantAdminLogsPage"


const router = createBrowserRouter([
	{
		element: (
			<RootFrame>
				<Outlet />
			</RootFrame>
		),
		children: [
			{ /* Tenant admin layout */
				element: (
					<TenantAdminLayout>
						<Outlet />
					</TenantAdminLayout>
				),
				children: [
					{
						path: RoutePaths.TenantAdmin.Dashboard,
						element: <TenantAdminDashboardPage />
					},
					{
						path: RoutePaths.TenantAdmin.Users,
						element: <TenantAdminUsersPage />
					},
					{
						path: RoutePaths.TenantAdmin.Backup,
						element: <TenantAdminBackupPage />
					},
					{
						path: RoutePaths.TenantAdmin.Billing,
						element: <TenantAdminBillingPage />
					},
					{
						path: RoutePaths.TenantAdmin.Logs,
						element: <TenantAdminLogsPage />
					}
				]
			},
			{ /* User layout */
				element: (
					<UserLayout>
						<Outlet />
					</UserLayout>
				),
				children: [
					{
						path: RoutePaths.Index,
						element: <IndexPage />
					},
					{
						path: RoutePaths.SignIn,
						element: <SignInPage />
					},
					{
						element: (
							<PrefetchDataFrame>
								<Outlet />
							</PrefetchDataFrame>
						),
						children: [
							{
								path: RoutePaths.SignOut,
								element: <SignOutPage />
							},
							{
								path: RoutePaths.Profile,
								element: <UserProfilePage />
							},
							{
								path: RoutePaths.Archive.List,
								element: <ArchiveItemListPage />
							},
							{
								path: `${RoutePaths.Archive.Edit}/:id`,
								element: <ArchiveItemEditPage />
							},
							{
								path: RoutePaths.Archive.New,
								element: <ArchiveItemNewPage />
							},
							{
								path: RoutePaths.Blob.List,
								element: <BlobListPage />
							},
							{
								path: `${RoutePaths.Email}/:id`,
								element: <EmailListPage />
							},
							{
								path: `${RoutePaths.ExternalAuthentication.Basic}/:provider`,
								element: <BasicAuthenticationPage />
							},
							{
								path: "test",
								element: <ComponentTestPage />
							}
						]
					}
				]
			}]
	}
])


export const App = () => {
	useEffect(() => {
		document.title = "My Personal Archive"
	}, [])

	return (
		<RouterProvider router={router} />
	)
}
