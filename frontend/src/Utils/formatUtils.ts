
export const formatFileSize = (fileSize: number): string => {
	const units = ["B", "KB", "MB", "GB"]
	const index = Math.floor(Math.log(fileSize) / Math.log(1024))
	const value = fileSize / Math.pow(1024, index)
	return `${value.toFixed(2)} ${units[index]}`
}


export const formatDate = (date: Date): string => {
	return new Intl.DateTimeFormat("no-NB", {
		day: "numeric",
		month: "long",
		year: "numeric"
	}).format(date)
}
