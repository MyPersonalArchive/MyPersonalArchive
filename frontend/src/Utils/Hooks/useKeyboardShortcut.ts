import { useEffect, useCallback, KeyboardEvent } from "react"


type KeyExpression = (e: KeyboardEvent) => boolean


const isEditableTarget = (target: EventTarget | null): boolean => {
	const element = target as HTMLElement | null
	if (!element || typeof element.tagName !== "string") return false

	return element.tagName === "INPUT"
		|| element.tagName === "TEXTAREA"
		|| element.tagName === "SELECT"
		|| element.isContentEditable
}


export const useKeyboardShortcut = (
	keyExpression: KeyExpression,
	callback: (e: KeyboardEvent) => void,
	enabled: boolean = true,
	ignoreEditable: boolean = false
) => {
	const handler = useCallback(
		(e: KeyboardEvent) => {
			if (ignoreEditable && isEditableTarget(e.target)) return

			if (keyExpression(e)) {
				e.preventDefault()
				e.stopPropagation()
				callback(e)
			}
		},
		[callback, keyExpression, ignoreEditable]
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
export const LeftKey: KeyExpression = keyExpression("ArrowLeft")
export const RightKey: KeyExpression = keyExpression("ArrowRight")
export const EscapeKey: KeyExpression = keyExpression("Escape")
