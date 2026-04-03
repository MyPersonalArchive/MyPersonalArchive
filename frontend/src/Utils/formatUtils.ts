
export const formatSize = (bytes?: number): string | undefined => {
	if(bytes === null || bytes === undefined) return undefined
	if (bytes === 0) return "0 B"
	const units = ["B", "KB", "MB", "GB", "TB", "PB"]
	const index = Math.floor(Math.log(bytes) / Math.log(1024))
	const value = bytes / Math.pow(1024, index)
	return `${value.toFixed(2)} ${units[index]}`
}

export const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat("no-NB", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(date)
}
