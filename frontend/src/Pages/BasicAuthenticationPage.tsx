import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useApiClient } from "../Utils/useApiClient"



export const BasicAuthenticationPage = () => {
	const [emailAddress, setEmailAddress] = useState("")
	const [username, setUsername] = useState("")
	const [password, setPassword] = useState("")

	const { provider } = useParams()

	const apiClient = useApiClient()
	const navigate = useNavigate()

	const authenticate = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		await apiClient.post("/api/RemoteAuthentication/store-basic-auth", { provider, emailAddress, username, password })
		navigate("/")
	}

	return (
		<>
			<form onSubmit={authenticate}>

				<h1 className="heading-1">
					Authenticate with {provider} (Basic Auth)
				</h1>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="emailAddress">Email Address</label>
					<input type="text"
						className="input"
						id="emailAddress" placeholder="" autoFocus data-1p-ignore
						value={emailAddress}
						onChange={event => setEmailAddress(event.target.value)}
					/>
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="username">Username</label>
					<input type="text"
						className="input"
						id="username" placeholder="" autoFocus data-1p-ignore
						value={username}
						onChange={event => setUsername(event.target.value)}
					/>
				</div>

				<div className="aligned-labels-and-inputs">
					<label htmlFor="password">Password</label>
					<input type="password"
						className="input"
						id="password" placeholder="" autoFocus data-1p-ignore
						value={password}
						onChange={event => setPassword(event.target.value)}
					/>
				</div>

				<div className="stack-horizontal to-the-right my-4">
					<Link className="link align-with-btn" to={-1 as any}>
						Back
					</Link>
					<button className="btn btn-primary" type="submit">
						Authenticate
					</button>
				</div>
			</form>
		</>
	)
}