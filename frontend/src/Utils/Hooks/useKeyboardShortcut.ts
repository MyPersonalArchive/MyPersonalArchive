import { useEffect, useCallback, KeyboardEvent } from "react"


type KeyExpression = (e: KeyboardEvent) => boolean


export const useKeyboardShortcut = (
	keyExpression: KeyExpression,
	callback: (e: KeyboardEvent) => void,
	enabled: boolean = true
) => {
	const handler = useCallback(
		(e: KeyboardEvent) => {
			if (keyExpression(e)) {
				e.preventDefault()
				e.stopPropagation()
				callback(e)
			}
		},
		[callback, keyExpression]
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


export const keyExpression = (key: string): KeyExpression => (e: KeyboardEvent) => e.key === key
export const SaveKey:KeyExpression = (e) => (e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")
export const LeftOrRightKey: KeyExpression = (e) => e.key === "ArrowLeft" || e.key === "ArrowRight"
