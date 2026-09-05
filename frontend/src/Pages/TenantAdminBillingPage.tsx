import { faMedal } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useEffect, useState } from "react"
import { useAtomValue } from "jotai"
import classNames from "classnames"
import { useApiClient } from "../Utils/Hooks/useApiClient"
import { currentUserAtom } from "../Utils/Atoms/currentUserAtom"
import { useSignalR } from "../Utils/Hooks/useSignalR"


type GetTiersResponse = {
	currentTierId: string
	availableTiers: Tier[]
}

type Tier = {
	id: string
	display: {
		medal: string
		title: string
		subtitle: string
		description: string
		features: string[]
	}
	maxStorageBytes: number
	pricePerMonthEUR: number
}

export const TenantAdminBillingPage = () => {
	const [tiersResponse, setTiersResponse] = useState<GetTiersResponse>()
	const apiClient = useApiClient()
	const currentUser = useAtomValue(currentUserAtom)
	const isOwner = currentUser?.roles.has("Owner") ?? false

	useEffect(() => {
		apiClient.query<GetTiersResponse>("GetTiers")
			.then(response => {
				setTiersResponse(response)
			})
	}, [])

	useSignalR(message => {
		if (message.messageType === "TierUpdated") {
			// Refresh the page to reflect the new tier
			apiClient.query<GetTiersResponse>("GetTiers")
				.then(response => {
					setTiersResponse(response)
				})
		}
	})

	const changeToTier = (id: string): void => {
		apiClient.execute("SetTier", { tierId: id })
	}


	return (
		<div className="form">
			<header className="header">
				<h1>Subscription and billing</h1>
			</header>

			<div className="flex gap-3 flex-wrap mb-8">
				{tiersResponse?.availableTiers.map(tier => {
					const isCurrentTier = tier.id === tiersResponse.currentTierId
					const maxStorageGB = (tier.maxStorageBytes / (1024 ** 3)).toFixed(0)

					return (
						<div key={tier.id} className={classNames("card bg-base-100 card-xs shadow-sm w-64 p-4 flex flex-col border-2! border-gray-200", { "border-blue-500!": isCurrentTier })}>
							<div className="card-body">
								{isCurrentTier
									? <span className="badge badge-xs badge-warning">
										Current plan
									</span>
									: <span className="h-4"></span>
								}
								<div className="flex justify-between items-baseline">
									<h2 className="text-3xl font-bold">{tier.display.title}</h2>
									<span className="text-xl">€{tier.pricePerMonthEUR.toFixed(2)}/mo</span>
								</div>
								<div className="text-sm mt-2 min-h-14">{tier.display.description}</div>

								<div className="text-sm text-gray-600">{tier.display.subtitle}</div>
								<ul className="text-sm mt-2 list-disc pl-4">
									{tier.display.features.map(feature => (
										<li key={feature}>{feature}</li>
									))}
								</ul>

								<div className="flex-1"></div>

								{isOwner &&
								<div className="mt-6">
									<button className="btn btn-primary btn-block"
										type="button"
										disabled={isCurrentTier}
										onClick={() => changeToTier(tier.id)}
									>
										{isCurrentTier ? "Current plan" : "Change to this tier"}
									</button>
								</div>
								}
							</div>
						</div>

					)
				})}
			</div>

			<div className="my-4 flex flex-row gap-4 items-baseline">
				<span>Your next billing date is: <strong>2024-09-01</strong></span>
				<div className="flex-1"></div>
				<button className="btn" type="button">Change payment method</button>
			</div>


			<table className="w-full">
				<thead>
					<tr>
						<th className="text-left text-lg font-semibold" colSpan={4}>Billing history</th>
					</tr>
				</thead>
				<tbody className=" text-sm">
					<tr className="hover:bg-gray-200">
						<td>2026-08-01</td>
						<td>Monthly Medium subscription</td>
						<td className="text-right">5.00 €</td>
						<td className="text-right"><a className="link" href="#">View invoice</a></td>
					</tr>
					<tr className="hover:bg-gray-200">
						<td>2026-07-01</td>
						<td>Monthly Medium subscription</td>
						<td className="text-right">5.00 €</td>
						<td className="text-right"><a className="link" href="#">View invoice</a></td>
					</tr>
					<tr className="hover:bg-gray-200">
						<td>2026-06-01</td>
						<td>Monthly Large subscription</td>
						<td className="text-right">10.00 €</td>
						<td className="text-right"><a className="link" href="#">View invoice</a></td>
					</tr>
					<tr className="hover:bg-gray-200">
						<td>2026-05-01</td>
						<td>Monthly Medium subscription</td>
						<td className="text-right">5.00 €</td>
						<td className="text-right"><a className="link" href="#">View invoice</a></td>
					</tr>
				</tbody>
			</table>

		</div>
	)
}
