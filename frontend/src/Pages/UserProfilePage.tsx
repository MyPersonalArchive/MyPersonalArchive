import { Link } from "react-router-dom"

export const UserProfilePage = () => {
	return (
		<div className="mx-auto px-4 py-6">
			<h1 className="heading-1">
				User Profile
			</h1>

			<div className="text-green-600 bg-gray-900 font-mono text-sm w-full p-2">//TODO: not implemented yet</div>

			<div className="aligned-labels-and-inputs">
				<label htmlFor="title">Display name</label>
				<input type="text"
					className="input"
					id="title" placeholder="" autoFocus required data-1p-ignore
				/>
			</div>

			<div className="stack-horizontal to-the-right my-4">
				<Link className="link align-with-btn" to={-1 as any}>
					Back
				</Link>
				<button className="btn btn-primary" type="submit">
					Save
				</button>
			</div>


			<h2 className="heading-2 mt-6">
				Connected Accounts
			</h2>
			<table className="w-full table with-column-seperators">
				<thead>
					<tr>
						<th>Account</th>
						<th>Provider</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>peter.pan@zoho.example</td>
						<td>Zoho mail</td>
					</tr>
					<tr>
						<td>peter@work.example</td>
						<td>GMail</td>
					</tr>
					<tr>
						<td>peter.private@fastmail.example</td>
						<td>Fastmail</td>
					</tr>
				</tbody>
			</table>

		</div>
	)
}