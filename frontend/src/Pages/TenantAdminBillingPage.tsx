import { faUser, faUserTie } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"


export const TenantAdminBillingPage = () => {

	return (
		<div className="form">
			<header className="header">
				<h1>Subscription and billing</h1>
				<div className="todo mt-2">
					//TODO: Implement this, since this is a placeholder/sample page
				</div>
			</header>

			<div className="todo mt-2">
				<div>Subscription and billing should at least allow:</div>
				- See current subscription and billing details<br />
				<div className="pl-4">- Change tier (Account owner only)</div>
				<div className="pl-4">- Update payment method (Account owner only)</div>
				<div className="pl-4">- View billing history</div>
				<div className="pl-4">- Download invoices</div>
				<div className="pl-4">- Information about billing periods and next billing date</div>
			</div>

		</div>
	)
}
