import { useEffect } from "react"
import { Attachment, useMailProvider } from "../Utils/useMailProvider"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"

export const EmailIngestionPage = () => {

	const { provider, setProvider, login, fetchAttachments, attachments, downloadAttachment, auth } = useMailProvider()

	return (
		<div>
			<select value={provider} onChange={e => setProvider(e.target.value as "gmail" | "fastmail")}>
				<option value="gmail">Gmail</option>
				<option value="fastmail">FastMail</option>
			</select>
			{!auth ? (
				<div>
					<button className="btn" onClick={() => {
						login()
					}} >Login with {provider}</button>
					
				</div>
			) : (
				<div>
					<button className="btn" onClick={fetchAttachments}>Fetch Attachments</button>
					<div className="overflow-x-auto my-4">
						<table className="w-full table with-column-seperators">
							<thead>
								<tr>
									<th>File</th>
									<th>Date</th>
									<th>From</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{
									attachments?.map(item => <Row key={item.messageId}
										attachment={item} download={(attachment) => downloadAttachment(attachment.messageId, attachment.fileName)} />)
								}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}

type RowProps = {
	attachment: Attachment,
	download: (attachment: Attachment) => void
}

const Row = ({ attachment, download }: RowProps) => {
	return (
		<tr>
			<td>
				{attachment.fileName}
			</td>
			<td>
				{attachment.date}
			</td>
			<td>
				{attachment.from}
			</td>
			<td>
				<button className="btn btn-primary" onClick={() => download(attachment)}>Download</button>
			</td>
		</tr>
	)
}

export default function AuthCallback() {
	const { handleAuthCallback } = useMailProvider()
	const navigate = useNavigate()


	useEffect(() => {
		(async () => {
			const tokens = await handleAuthCallback()
			if (tokens) {
				console.log("handleAuthCallback.tokens", tokens)
				// Redirect user back to app dashboard
				navigate(RoutePaths.EmailIngestion)
			}
		})()
	}, [])

	return <p>Finalizing authentication...</p>
}