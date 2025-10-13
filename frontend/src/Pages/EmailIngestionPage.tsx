import { useEffect } from "react"
import { Email, EmailAttachment, useMailProvider } from "../Utils/useMailProvider"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import DOMPurify from "dompurify"

export const EmailIngestionPage = () => {

	const { provider, setProvider, login, fetchAttachments, emails, downloadAttachment, uploadAttachments, listAvailableFolders } = useMailProvider()

	const search = () => {
		fetchAttachments({
			provider,
			folders: ["INBOX"],
			limit: 300,
		})
	}

	return (
		<div>
			<select value={provider} onChange={e => setProvider(e.target.value as "gmail" | "fastmail")}>
				<option value="gmail">Gmail</option>
				<option value="fastmail">Fastmail</option>
			</select>
			
			<div>
				<button className="btn" onClick={() => {
					login()
				}} >Login with {provider}</button>

				<button className="btn" onClick={() => {
					listAvailableFolders()
				}} >List Folders (see network tab)</button>
					
			</div>
			<div>
				<button className="btn" onClick={search}>Fetch Attachments</button>
				<div className="overflow-x-auto my-4">
					<table className="w-full table with-column-seperators">
						<thead>
							<tr>
								<th>Subject</th>
								<th>Body</th>
								<th>From</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{
								emails?.map(item => <Row key={item.uniqueId}
									email={item} 
									addToUnallocated={() => uploadAttachments(item.uniqueId, item.attachments)}
									download={(attachment) => downloadAttachment(item.uniqueId, attachment.fileName)} />)
							}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

type RowProps = {
	email: Email,
	download: (attachment: EmailAttachment) => void
	addToUnallocated: (attachment: EmailAttachment) => void
}

const Row = ({ email, download, addToUnallocated }: RowProps) => {
	
	const purifyHtml = (html: string) => {
		const cleanHtml = DOMPurify.sanitize(html)
		return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
	}

	return (
		<tr>
			<td>
				{email.subject}
			</td>
			<td className="max-w-3xl w-full overflow-hidden">
				{purifyHtml(email.htmlBody)} 
			</td>
			<td>
				{email.from}
			</td>
			<td>
				{email.attachments.map((attachment, ix) => (
					<div>
						<span key={ix} className="inline-block bg-gray-200 text-gray-700 rounded-full px-2 py-1 mr-1 text-xs">{attachment.fileName}</span>
						<button className="btn btn-primary" onClick={() => addToUnallocated(attachment)}>Add to unallocated</button>
						<button className="btn btn-primary" onClick={() => download(attachment)}>Download</button>
					</div>
				))}
				
			</td>
		</tr>
	)
}

export default function AuthCallback() {
	const { handleAuthCallback } = useMailProvider()
	const navigate = useNavigate()


	useEffect(() => {
		(async () => {
			await handleAuthCallback()
			// Redirect user back to app dashboard
			navigate(RoutePaths.EmailIngestion)
		})()
	}, [])

	return <p>Finalizing authentication...</p>
}