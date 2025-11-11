import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import img from "../assets/receiptly_logo.png"
import { useAtom, useSetAtom } from "jotai"
import { lastLoggedInUsernameAtom, currentUserAtom, lastRememberMeCheckedAtom } from "../Utils/Atoms"


type SignInResponse = {
	username: string
	fullname: string
	availableTenantIds: number[]
	accessToken: string
}


export const SignInPage = () => {
	const userNameInputRef = useRef<HTMLInputElement>(null)
	const passwordInputRef = useRef<HTMLInputElement>(null)

	const [lastLoggedInUsername, setLastLoggedInUsername] = useAtom(lastLoggedInUsernameAtom)
	const [lastRememberMeChecked, setLastRememberMeChecked] = useAtom(lastRememberMeCheckedAtom)
	const setCurrentUser = useSetAtom(currentUserAtom)

	const [loginFailed, setLoginError] = useState(false)
	const [isLoading, setIsLoading] = useState(false)
	const [username, setUsername] = useState(lastLoggedInUsername ?? "")
	const [password, setPassword] = useState("")
	const [rememberMe, setRememberMe] = useState(lastRememberMeChecked ?? false)

	const navigate = useNavigate()

	useEffect(() => {
		if (username === "" && userNameInputRef.current) {
			userNameInputRef.current.focus()
		} else if (password === "" && passwordInputRef.current) {
			passwordInputRef.current.focus()
		}
	}, [])

	const login = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		setIsLoading(true)

		const success = await loginAction(username, password, rememberMe)
		if (success) {
			const redirect = new URLSearchParams(window.location.search).get("redirect")
			navigate(redirect ?? RoutePaths.Index)
		} else {
			setIsLoading(false)
		}

		setLastLoggedInUsername(username)
		setLastRememberMeChecked(rememberMe)
		setLoginError(!success)
	}


	const loginAction = async (username: string, password: string, rememberMe: boolean) => {
		try {
			const payload = {
				username,
				password,
				rememberMe
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

			if (!httpResponse.ok) {
				// Invalid credentials
				return false
			}

			const response = await httpResponse.json() as SignInResponse

			const user = {
				username: response.username,
				fullname: response.fullname,
				availableTenantIds: response.availableTenantIds
			}
			setCurrentUser(user)

			return true
		} catch(exception) {
			console.error("Sign-in failed due to exception", exception)
			return false
		}
	}


	return (
		<div className="flex flex-row">
			<div>
				<img src={img} alt="" />
			</div>
			<div>
				<h1 className="heading-2">
					Sign in to your account
				</h1>
				{isLoading
					? <>Loading data...</>
					: <>
						{loginFailed && <p className="message error">Username or password is incorrect</p>}
						<form onSubmit={login}>
							<div className="aligned-labels-and-inputs">
								<label htmlFor="username">Email</label>
								<input className="input" type="email"
									id="username" autoComplete="username" placeholder=""
									required
									ref={userNameInputRef}
									value={username}
									onChange={event => setUsername(event.target.value)}
								/>
							</div>
							<div className="aligned-labels-and-inputs">
								<label htmlFor="password">Password</label>
								<input className="input" type="password"
									id="password" autoComplete="current-password" placeholder=""
									required
									ref={passwordInputRef}
									value={password}
									onChange={event => setPassword(event.target.value)}
								/>
							</div>

							<div className="my-4">
								<div>
									<label htmlFor="rememberMe">
										<input className="input" type="checkbox"
											id="rememberMe"
											checked={rememberMe}
											onChange={event => setRememberMe(event.target.checked)}
										/>
										Remember me
									</label>
								</div>
							</div>

							<div className="push-right">
								<button className="btn btn-primary" type="submit">
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
