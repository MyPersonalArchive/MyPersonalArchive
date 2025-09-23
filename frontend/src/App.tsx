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
import { PredefinedSearchEditPage } from "./Pages/PredefinedSearchEditPage"


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
                        path: RoutePaths.Blobs,
                        element: <BlobListPage />
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
                        path: "search/edit",
                        element: <PredefinedSearchEditPage />
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
