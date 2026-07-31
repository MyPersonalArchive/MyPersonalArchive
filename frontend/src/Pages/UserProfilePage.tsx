import { Link } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"


export const UserProfilePage = () => {
	return (
		<>
			<header className="header">
				<h1>My profile</h1>
			</header>

			<Link className="link" to={RoutePaths.SignOut}>
				Sign out
			</Link>
		</>
	)
}
