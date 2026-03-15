import { atomWithReducer } from "jotai/utils"


export type LayoutState = {
	navIsOpen: boolean
	profileDropdownIsOpen: boolean
	preferencesIsOpen: boolean
}


type LayoutCommand =
	| { action: "TOGGLE_NAV" }
	| { action: "CLOSE_NAV" }
	| { action: "TOGGLE_PROFILE_DROPDOWN" }
	| { action: "CLOSE_PROFILE_DROPDOWN" }
	| { action: "TOGGLE_PREFERENCES" }

const reducer = (state: LayoutState, command: LayoutCommand): LayoutState => {
	switch (command.action) {
		case "TOGGLE_NAV":
			return {
				...state,
				navIsOpen: !state.navIsOpen,
				profileDropdownIsOpen: false,
			}

		case "CLOSE_NAV":
			return {
				...state,
				navIsOpen: false,
				profileDropdownIsOpen: false
			}

		case "TOGGLE_PROFILE_DROPDOWN":
			return {
				...state,
				profileDropdownIsOpen: !state.profileDropdownIsOpen,
				navIsOpen: false,
			}

		case "CLOSE_PROFILE_DROPDOWN":
			return {
				...state,
				navIsOpen: false,
				profileDropdownIsOpen: false
			}

		case "TOGGLE_PREFERENCES":
			return {
				...state,
				preferencesIsOpen: !state.preferencesIsOpen,
				profileDropdownIsOpen: false
			}
	}
}


export const layoutStateAtom = atomWithReducer<LayoutState, LayoutCommand>({ navIsOpen: false, profileDropdownIsOpen: false, preferencesIsOpen: false }, reducer)