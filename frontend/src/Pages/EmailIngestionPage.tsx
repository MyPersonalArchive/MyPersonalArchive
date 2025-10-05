import { useEffect } from "react"
import { EmailAttachment, useMailProvider } from "../Utils/useMailProvider"
import { useNavigate } from "react-router-dom"
import { RoutePaths } from "../RoutePaths"
import { useApiClient } from "../Utils/useApiClient"

interface UploadAttachmentRequest {
  attachments: Attachment[]
}

interface Attachment {
  messageId: string
  fileName: string
}

export const EmailIngestionPage = () => {

	const { provider, setProvider, login, fetchAttachments, attachments, downloadAttachment } = useMailProvider()
	const apiClient = useApiClient()

	const uploadBlobs = async (emailAttachments: EmailAttachment[]): Promise<void> => {

		const body: UploadAttachmentRequest = {
			attachments: emailAttachments.map(a => ({
				messageId: a.messageId,
				fileName: a.fileName
			})),
		}

		apiClient.post(`/api/emailingestion/${provider}/unallocate-attachment`, body, { credentials: "include" })
	}

	const search = () => {
		fetchAttachments({
			provider,
			limit: 300,
		})
	}

	return (
		<div>
			<select value={provider} onChange={e => setProvider(e.target.value as "gmail" | "fastmail")}>
				<option value="gmail">Gmail</option>
				<option value="fastmail">FastMail</option>
			</select>
			
			<div>
				<button className="btn" onClick={() => {
					login()
				}} >Login with {provider}</button>
					
			</div>
			<div>
				<button className="btn" onClick={search}>Fetch Attachments</button>
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
									attachment={item} 
									addToUnallocated={(attachment) => uploadBlobs([attachment])}
									download={(attachment) => downloadAttachment(attachment.messageId, attachment.fileName)} />)
							}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

type RowProps = {
	attachment: EmailAttachment,
	download: (attachment: EmailAttachment) => void
	addToUnallocated: (attachment: EmailAttachment) => void
}

const Row = ({ attachment, download, addToUnallocated }: RowProps) => {
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
				<button className="btn btn-primary" onClick={() => addToUnallocated(attachment)}>Add to unallocated</button>
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
			await handleAuthCallback()
			// Redirect user back to app dashboard
			navigate(RoutePaths.EmailIngestion)
		})()
	}, [])

	return <p>Finalizing authentication...</p>
}