import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"
import { SignInPage } from "./Pages/SignInPage"
import { useEffect } from "react"
import { RoutePaths } from "./RoutePaths"
import { SignOutPage } from "./Pages/SignOutPage"
import { ArchiveItemListPage } from "./Pages/ArchiveItemListPage"
import { IndexPage } from "./Pages/IndexPage"
import { ArchiveItemEditPage } from "./Pages/ArchiveItemEditPage"
import { ArchiveItemNewPage } from "./Pages/ArchiveItemNewPage"
import { PrefetchDataFrame } from "./Frames/PrefetchDataFrame"
import { RequireTenant } from "./Frames/RequireTenant"
import { Layout } from "./Frames/Layout"
import { BlobListPage } from "./Pages/BlobListPage"
import { UserProfilePage } from "./Pages/UserProfilePage"
import { CurrentTenantIdFrame } from "./Frames/CurrentTenantIdFrame"
import { RootFrame } from "./Frames/RootFrame"
import { EmailListPage } from "./Pages/EmailListPage"
import { BackupPage } from "./Pages/BackupPage"
import { BasicAuthenticationPage } from "./Pages/BasicAuthenticationPage"

const router = createBrowserRouter([
	{
		element: (
			<RootFrame>
				<CurrentTenantIdFrame>
					<Layout>
						<Outlet />
					</Layout>
				</CurrentTenantIdFrame>
			</RootFrame>
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
					<RequireTenant>
						<PrefetchDataFrame>
							<Outlet />
						</PrefetchDataFrame>
					</RequireTenant>
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
						path: RoutePaths.Backup,
						element: <BackupPage />
					}
				]
			}
		]
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
