
export const createQueryString = (payload: any, options = { skipEmptyStrings: false }) => {
	if (payload != undefined && Object.keys(payload).length > 0) {
		const params = new URLSearchParams()

		Object.entries(payload).forEach(([key, value]: [string, any]) => {
			if (Array.isArray(value)) {
				value.forEach(val => { params.append(key, val) })
			} else if (value === null) {
				params.append(key, "")
			} else if (value === undefined) {
				// don't append
			} else if (value === "" && options.skipEmptyStrings === true) {
				// don't append
			} else {
				params.append(key, value)
			}
		})
		return `?${params}`
	}
	return ""
}
