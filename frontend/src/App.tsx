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
import { Layout } from "./Components/Layout"
import { PrefetchDataFrame } from "./Frames/PrefetchDataFrame"
import { RequireTenant } from "./Frames/RequireTenant"


const routers = createBrowserRouter([
    {
        element: (
            <Layout>
                <Outlet />
            </Layout>
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
