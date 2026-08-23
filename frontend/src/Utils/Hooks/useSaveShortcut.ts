import { useEffect, useCallback, KeyboardEvent } from "react"

export const useSaveShortcut = (
	callback: (e: KeyboardEvent) => void,
	enabled: boolean = true
) => {
	const handler = useCallback(
		(e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
				e.preventDefault()
				e.stopPropagation()
				callback(e)
			}
		},
		[callback]
	)

	useEffect(() => {
		if (!enabled) return

		window.addEventListener("keydown", handler as unknown as EventListener)

		return () => {
			// Remove the event listener when the component unmounts or when enabled changes
			window.removeEventListener("keydown", handler as unknown as EventListener)
		}
	}, [handler, enabled])
}
