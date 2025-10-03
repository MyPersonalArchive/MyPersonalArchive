import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom"
import { SignInPage } from "./Pages/SignInPage"
import { useEffect } from "react"
import { RoutePaths } from "./RoutePaths"
import { SignOutPage } from "./Pages/SignOutPage"
import { ArchiveItemListPage } from "./Pages/ArchiveItemListPage"
import { RequireAuthentication } from "./Frames/RequireAuthentication"
import { IndexPage } from "./Pages/IndexPage"
import { ArchiveItemEditPage } from "./Pages/ArchiveItemEditPage"
import { ArchiveItemNewPage } from "./Pages/ArchiveItemNewPage"
import { PrefetchDataFrame } from "./Frames/PrefetchDataFrame"
import { RequireTenant } from "./Frames/RequireTenant"
import { Layout } from "./Frames/Layout"
import { BlobListPage } from "./Pages/BlobListPage"
import { UserProfilePage } from "./Pages/UserProfilePage"
import { CurrentTenantIdFrame } from "./Frames/CurrentTenantIdFrame"
import { StoredFilterListPage } from "./Pages/StoredFilterListPage"
import AuthCallback, { EmailIngestionPage } from "./Pages/EmailIngestionPage"


const routers = createBrowserRouter([
	{
		element: (
			<CurrentTenantIdFrame>
				<Layout>
					<Outlet />
				</Layout>
			</CurrentTenantIdFrame>
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
					<RequireAuthentication>
						<RequireTenant>
							<PrefetchDataFrame>
								<Outlet />
							</PrefetchDataFrame>
						</RequireTenant>
					</RequireAuthentication>
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
						path: RoutePaths.Archive,
						element: <ArchiveItemListPage />
					},
					{
						path: "archive/edit/:id",
						element: <ArchiveItemEditPage />
					},
					{
						path: "archive/new",
						element: <ArchiveItemNewPage />
					},
					{
						path: RoutePaths.Blobs,
						element: <BlobListPage />
					},
					{
						path: RoutePaths.StoredFilters,
						element: <StoredFilterListPage />
					},
					{
						path: RoutePaths.EmailIngestion,
						element: <EmailIngestionPage />
					},
					{
						path: "/auth-callback",
						element: <AuthCallback />
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
		<>
			<RouterProvider router={routers} />
		</>
	)
}
