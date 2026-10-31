import { useEffect, useRef } from "react"
import { layoutStateAtom } from "../Atoms/layoutStateAtom"
import { useAtomValue } from "jotai"


export const useAdjustmentsMode = (saveFn: () => void) => {
	const { adjustmentsModeIsOpen } = useAtomValue(layoutStateAtom)
	const previousAdjustmentsModeIsOpen = useRef(adjustmentsModeIsOpen)

	useEffect(() => {
		if (previousAdjustmentsModeIsOpen.current && !adjustmentsModeIsOpen) {
			saveFn()
		}
		previousAdjustmentsModeIsOpen.current = adjustmentsModeIsOpen
	}, [adjustmentsModeIsOpen])

	return adjustmentsModeIsOpen
}