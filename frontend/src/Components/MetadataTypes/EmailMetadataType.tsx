import { MetadataComponentProps, MetadataType } from "../../Utils/Metadata/types"
import { isoToShortDateDisplay, isoToShortTimeDisplay } from "../../Utils/formatUtils"


type Command =
	| { action: "INIT" }
	| { action: "METADATA_LOADED", metadata: State }
	| { action: "SET_EMAIL_METADATA", subject: string, date: string, from: string[], to: string[], body: string }
	| { action: "SET_SUBJECT", subject: string }
	| { action: "SET_DATE", date: string }
	| { action: "SET_FROM", from: string[] }
	| { action: "SET_TO", to: string[] }
	| { action: "SET_BODY", body: string }

type State = {
	subject: string
	date: string
	from: string[]
	to: string[]
	body: string
}


const summarize = (state: State) => {
	if(!state || !state.from.length && !state.to.length && !state.date) return undefined

	const fromName = state.from.map(s => s.replace(/ \<.+?>/g, "").replace(/"/g, "")).join(", ")
	const fromPart = fromName ? `from ${fromName}` : undefined
	
	const toNames = state.to.map(s => s.replace(/ \<.+?>/g, "").replace(/"/g, "")).join(", ")
	const toPart = toNames.length > 0 ? `to ${toNames}` : undefined

	const datePart = state.date ? `on ${isoToShortDateDisplay(state.date)} ${isoToShortTimeDisplay(state.date)}` : undefined
	
	const parts = [fromPart, toPart, datePart].filter(part => part !== undefined)
	return parts.join(", ")
}


const reducer = (state: State, command: Command): State => {
	switch (command.action) {
		case "INIT":
			return {
				subject: "",
				date: "",
				from: [],
				to: [],
				body: ""
			}

		case "METADATA_LOADED":
			return {
				...state,
				...command.metadata
			}

		case "SET_EMAIL_METADATA":
			return {
				...state,
				subject: command.subject,
				date: command.date,
				from: command.from,
				to: command.to,
				body: command.body
			}

		case "SET_SUBJECT":
			return {
				...state,
				subject: command.subject
			}

		case "SET_DATE":
			return {
				...state,
				date: command.date
			}

		case "SET_FROM":
			return {
				...state,
				from: command.from
			}

		case "SET_TO":
			return {
				...state,
				to: command.to
			}

		case "SET_BODY":
			return {
				...state,
				body: command.body
			}

		default:
			return state
	}
}

const Component = (props: MetadataComponentProps) => {
	const state = props.state
	const dispatch = props.dispatch as React.Dispatch<Command>

	const formatLocalDateForInput = (datetimeOffsetString: string) => {
		// We get the datetimeoffset from the server, and in order to adjust the time based on timezone we calculate the actual local time.
		// This because the datetime-local input type does not take timezone into account.
		const date = new Date(datetimeOffsetString)
		const tzOffset = date.getTimezoneOffset() * 60000
		const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
		return localISOTime
	}


	return (
		<>
			<div className="flex flex-col gap-4 px-4">
				<label className="input w-full" htmlFor="email-subject">
					<span className="label">Subject</span>
					<input
						type="text"
						id="email-subject"
						className="input"
						placeholder="Email subject..."
						value={state.subject}
						onChange={e => dispatch({ action: "SET_SUBJECT", subject: e.target.value })}
					/>
				</label>

				<label className="input" htmlFor="email-date">
					<span className="label">Date</span>
					<input
						type="datetime-local"
						id="email-date"
						className="input"
						value={state.date ? formatLocalDateForInput(state.date) : ""}
						onChange={e => dispatch({ action: "SET_DATE", date: e.target.value })}
					/>
				</label>

				<label className="input w-full" htmlFor="email-from">
					<span className="label">From</span>
					<input
						type="email"
						id="email-from"
						className="input"
						placeholder="sender@example.com"
						value={state.from.join("; ")}
						onChange={e => dispatch({ action: "SET_FROM", from: e.target.value.split(/[,;]/).map(s => s.trim()) })}
					/>
				</label>

				<label className="input w-full" htmlFor="email-to">
					<span className="label">To</span>
					<input
						type="email"
						id="email-to"
						className="input"
						placeholder="recipient@example.com"
						value={state.to.join("; ")}
						onChange={e => dispatch({ action: "SET_TO", to: e.target.value.split(/[,;]/).map(s => s.trim()) })}
					/>
				</label>

				<label className="textarea w-full" htmlFor="email-body">
					<span className="label">Body</span>
					<textarea
						rows={6}
						id="email-body"
						className="input w-full"
						placeholder="Email content..."
						value={state.body}
						onChange={e => dispatch({ action: "SET_BODY", body: e.target.value })}
					/>
				</label>
			</div>
		</>
	)
}

export default {
	displayName: "Email",
	summarize,
	path: "email",
	component: Component,
	reducer
} as MetadataType