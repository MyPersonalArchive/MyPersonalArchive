import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import img from "../assets/receiptly_logo.png";
import { useAtom, useSetAtom } from "jotai"
import { accessTokenAtom, lastLoggedInUsernameAtom, loggedInUserAtom } from "../Utils/Atoms"


export const SignInPage = () => {
    const userNameInputRef = useRef<HTMLInputElement>(null)
    const passwordInputRef = useRef<HTMLInputElement>(null)

    const [lastLoggedInUsername, setLastLoggedInUsername] = useAtom(lastLoggedInUsernameAtom)
    const setAccessToken = useSetAtom(accessTokenAtom)
    const setLoggedInUser = useSetAtom(loggedInUserAtom)

    const [loginFailed, setLoginError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [username, setUsername] = useState(lastLoggedInUsername ?? "")
    const [password, setPassword] = useState("")

    const navigate = useNavigate()

    useEffect(() => {
        if(username === "" && userNameInputRef.current) {
            userNameInputRef.current.focus()
        } else if(password === "" && passwordInputRef.current) {
            passwordInputRef.current.focus()
        }
    }, [])

    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        setIsLoading(true)

        const success = await loginAction(username, password)
        if (success) {
            var redirect = new URLSearchParams(window.location.search).get("redirect")
            navigate(redirect ?? RoutePaths.Archive)
        } else {
            setIsLoading(false)
        }

        setLastLoggedInUsername(username)
        setLoginError(!success)
    }


    const loginAction = async (email: string, password: string) => {
        try {
            const payload = {
                username: email,
                password: password
            }
            // We're using the fetch API instead of apiClient here because we don't have an access token nor tenantId yet
            const httpResponse = await fetch("/api/authentication/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
                credentials: "include"
            })

            if (httpResponse.status !== 200) {
                // Invalid credentials
                return false
            }

            const response = await httpResponse.json() as SignInResponse

            const user = {
                username: response.username,
                fullname: response.fullname,
                availableTenantIds: response.availableTenantIds
            }
            setLoggedInUser(user)
            setAccessToken(response.accessToken)

            return true
        } catch {
            return false
        }
    }


    return (
        <div className="signinpage">
            <div>
                <img src={img} alt="" />
            </div>
            <div>
                <h1>Sign in to your account</h1>
                {isLoading
                    ? <>Loading data...</>
                    : <>
                        {loginFailed && <p className="message error">Username or password is incorrect</p>}
                        <form onSubmit={login} className="vertical-stacked-down-flex">
                            <div>
                                <label htmlFor="username">Email</label>
                                &nbsp;
                                <input
                                    type="email"
                                    id="username"
                                    ref={userNameInputRef}
                                    autoComplete="username"
                                    placeholder=""
                                    required
                                    value={username}
                                    onChange={event => setUsername(event.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password">Password</label>
                                &nbsp;
                                <input
                                    type="password"
                                    id="password"
                                    ref={passwordInputRef}
                                    autoComplete="current-password"
                                    placeholder=""
                                    required
                                    value={password}
                                    onChange={event => setPassword(event.target.value)}
                                />
                            </div>
                            {/* <div>
                                    <input type="checkbox" id="rememberMe" />
                                    &nbsp;
                                    <label htmlFor="rememberMe">Remember me</label>
                                </div> */}
                            <div>
                                <button type="submit">
                                    Log in
                                </button>
                            </div>
                        </form>
                    </>
                }
            </div>
        </div>
    )
}


type SignInResponse = {
    username: string
    fullname: string
    availableTenantIds: number[]
    accessToken: string
}