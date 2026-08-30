
export const formatSize = (bytes?: number): string | undefined => {
	if (bytes === null || bytes === undefined) return undefined
	if (bytes === 0) return "0 B"
	const units = ["B", "KB", "MB", "GB", "TB", "PB"]
	const unitsIndex = Math.floor(Math.log(bytes) / Math.log(1024))
	const value = bytes / Math.pow(1024, unitsIndex)
	return unitsIndex === 0
		? `${value.toFixed(0)} ${units[0]}`
		: `${value.toFixed(2)} ${units[unitsIndex]}`
}


export const isoToShortDateDisplay = (isoString: string | null | undefined): string => {
	if (!isoString) return ""

	const [year, month, day] = isoString.split("T")[0].split("-").map(Number)
	const date = new Date(year, month - 1, day)

	return dateToShortDateDisplay(date)
}

export const dateToShortDateDisplay = (date: Date | null | undefined): string => {
	if (!date || isNaN(date.getTime())) return ""

	return date.toLocaleDateString(navigator.language, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
}

//

export const formatDateTime = (date?: Date): string | undefined => {
	if (date === null || date === undefined) return undefined
	return new Intl.DateTimeFormat("no-NB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",

	}).format(date)
}


export const formatDuration = (seconds?: number): string | undefined => {
	if (seconds === null || seconds === undefined) return undefined
	if (seconds === 0) return "-"
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const secs = Math.floor(seconds % 60)
	
	if (hours > 0) {
		return `${hours}h ${minutes}m ${secs}s`
	} else if (minutes > 0) {
		return `${minutes}m ${secs}s`
	} else {
		return `${secs}s`
	}
}
