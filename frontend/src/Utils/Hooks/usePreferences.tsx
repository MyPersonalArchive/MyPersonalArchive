import { useAtom, useAtomValue } from "jotai"
import { isPreferencesOpenAtom } from "../Atoms"
import { externalAccountsAtom } from "../Atoms/externalAccountsAtom"
import { storedFiltersAtom } from "../Atoms/storedFiltersAtom"
import { useApiClient } from "./useApiClient"

export const usePreferences = () => {
	const [isPreferencesOpen, setIsPreferencesOpen] = useAtom(isPreferencesOpenAtom)

	const externalAccounts = useAtomValue(externalAccountsAtom)
	const storedFilters = useAtomValue(storedFiltersAtom)

	const apiClient = useApiClient()

	const openPreferences = () => setIsPreferencesOpen(true)

	const closePreferences = async () => {
		apiClient.post("/api/execute/SaveExternalAccounts", {
			externalAccounts
		})

		await apiClient.post("/api/execute/SaveStoredFilters", {
			storedFilters: storedFilters.map(filter => ({
				...filter,
				filterDefinition: {
					...filter.filterDefinition,
					metadataTypes: Array.from(filter.filterDefinition.metadataTypes)
				}
			}))
		})
		setIsPreferencesOpen(false)
	}

	return {
		isPreferencesOpen,
		openPreferences,
		closePreferences
	}
}
