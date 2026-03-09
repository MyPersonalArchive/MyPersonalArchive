type ReplaceFn<TData> = (data: TData) => TData

// Returns a new array, with the element at index replaced with replacement item or calling the replacement function on arr[index]
export function changeAtIndex<TData>(inArray: Array<TData>, index: number, replacement: TData | ReplaceFn<TData>) {
	if (typeof replacement == "function") {
		replacement = (replacement as ReplaceFn<TData>)(inArray[index])
	}

	return inArray.with(index, replacement)
}

export function changeAtKey<TData>(inArray: Array<TData>, predicate: (item: TData) => boolean, replacement: TData | ReplaceFn<TData>) {
	const index = inArray.findIndex(predicate)
	if (index === -1) return inArray
	return changeAtIndex(inArray, index, replacement)
}

// Returns a new array, with the insertion element inserted at index
export function insertAtIndex<TData>(inArray: Array<TData>, index: number, insertion: TData) {
	return inArray.toSpliced(index, 0, insertion)
}

// Returns a new array, with the element at index removed
export function removeAtIndex<TData>(inArray: Array<TData>, index: number) {
	return inArray.toSpliced(index, 1)
}

export function removeAtKey<TData>(inArray: Array<TData>, predicate: (item: TData) => boolean) {
	const index = inArray.findIndex(predicate)
	if (index === -1) return inArray
	return removeAtIndex(inArray, index)
}

// Returns a new array, with with an element moved from fromIndex to toIndex
export function moveInArray<TData>(inArray: Array<TData>, fromIndex: number, toIndex: number) {
	const outArray = [...inArray]
	const [itemToMove] = outArray.splice(fromIndex, 1)
	outArray.splice(toIndex, 0, itemToMove)

	return outArray
}
