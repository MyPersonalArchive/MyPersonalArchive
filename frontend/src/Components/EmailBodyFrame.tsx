
type Props = {
	html: string
}
// Renders untrusted email HTML in a sandboxed iframe, so its styles can't leak into the app (and vice versa) and scripts can't run.
export const EmailBodyFrame = ({ html }: Props) => {
	const baseHead = "<base target=\"_blank\"><style>body{margin:0;font-family:sans-serif;word-wrap:break-word}img{max-width:100%;height:auto}</style>"
	return (
		<iframe
			title="Email content"
			className="w-full h-full min-h-[60vh] border-0 bg-white"
			sandbox="allow-popups allow-popups-to-escape-sandbox"
			srcDoc={`<!DOCTYPE html><html><head>${baseHead}</head><body>${html}</body></html>`}
		/>
	)
}
