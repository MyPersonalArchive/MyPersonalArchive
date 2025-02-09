import { createBrowserRouter, RouterProvider } from "react-router-dom"
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
import { SignalRProvider } from "./Frames/SignalRProvider"


const routers = createBrowserRouter([
    {
        element: <Layout />,
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
                element: <RequireAuthentication />,
                children: [
                    {
                        element: <SignalRProvider />,
                        children: [
                            {
                                path: RoutePaths.SignOut,
                                element: <SignOutPage />
                            },
                            {
                                path: RoutePaths.Archive,
                                element: <ArchiveItemListPage />
                            }, {
                                path: "archive/edit/:receiptId",
                                element: <ArchiveItemEditPage />
                            },
                            {
                                path: "receipt/new",
                                element: <ArchiveItemNewPage />
                            }
                        ]
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
