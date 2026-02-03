type ReplaceFn<TData> = (data: TData) => TData

// Returns a new array, with the element at pos replaced with replacement item or calling the replacement function on arr[pos]
export function changeAtIndex<TData>(inArray: Array<TData>, index: number, replacement: TData | ReplaceFn<TData>) {
	if (typeof replacement == "function") {
		replacement = (replacement as ReplaceFn<TData>)(inArray[index])
	}

	return [...inArray.slice(0, index), replacement, ...inArray.slice(index + 1)]
}

// Returns a new array, with the insertion element inserted at pos
export function insertAtIndex<TData>(inArray: Array<TData>, index: number, insertion: TData) {
	return [...inArray.slice(0, index), insertion, ...inArray.slice(index)]
}

// Returns a new array, with the element at pos removed
export function removeAtIndex<TData>(inArray: Array<TData>, index: number) {
	return [...inArray.slice(0, index), ...inArray.slice(index + 1)]
}

// Returns a new array, with with an element moved from fromIndex to toIndex
export function moveInArray<TData>(inArray: Array<TData>, fromIndex: number, toIndex: number) {
	const outArray = [...inArray]
	const [itemToMove] = outArray.splice(fromIndex, 1)
	outArray.splice(toIndex, 0, itemToMove)

	return outArray
}
