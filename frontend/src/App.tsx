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
import { StoredFilterListPage } from "./Pages/StoredFilterListPage"
import { EmailListPage } from "./Pages/EmailListPage"


const routers = createBrowserRouter([
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
						path: RoutePaths.Email,
						element: <EmailListPage />
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
