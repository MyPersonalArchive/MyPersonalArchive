
/**
 * This function wraps a click handler to check if the user is currently selecting text. If they are, it prevents the click action from being triggered.
 * @param fn The click handler function to wrap.
 * @returns A new click handler function that only triggers if no text is being selected.
 */
export const clickIfNotSelectingText = (fn: (event: React.MouseEvent) => void) => (event: React.MouseEvent) =>
{
	const selection = window.getSelection()
	if (selection && selection.toString().length > 0) {
		// User is selecting text — don't treat as a click
		return
	}

	fn(event)
}