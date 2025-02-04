import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import img from "../assets/receiptly_logo.png";
import { useAtom, useSetAtom } from "jotai"
import { accessTokenAtom, lastLoggedInUsernameAtom, loggedInUserAtom } from "../Utils/Atoms"


export const SignInPage = () => {
    const [lastLoggedInUsername, setLastLoggedInUsername] = useAtom(lastLoggedInUsernameAtom)
    const setAccessToken = useSetAtom(accessTokenAtom)

    const [loginFailed, setLoginError] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [username, setUsername] = useState(lastLoggedInUsername ?? "")
    const [password, setPassword] = useState("")
    const [loggedInUser, setLoggedInUser] = useAtom(loggedInUserAtom)

    const navigate = useNavigate()

    useEffect(() => {
        if (loggedInUser !== undefined) {
            navigate(RoutePaths.Archive)
        }
    })

    const login = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        setIsLoading(true)

        const success = await loginAction(username, password)
        if (success) {
            navigate(RoutePaths.Archive)
        } else {
            setIsLoading(false)
        }

        setLastLoggedInUsername(username)
        setLoginError(!success)
    }


    const loginAction = async (email: string, password: string) => {
        try {
            const response = await fetch("/api/authentication/signin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: email,
                    password: password,
                }),
            })
            if (response.status !== 200) {
                return false
            }

            const json = await response.json() as SignInResponse
            const user = {
                username: json.username,
                fullname: json.fullname
            }
            setLoggedInUser(user)
            setAccessToken(json.accessToken)

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
                                    autoComplete="username"
                                    placeholder=""
                                    autoFocus
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
                                    autoComplete="current-password"
                                    placeholder=""
                                    id="password"
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
    accessToken: string
}