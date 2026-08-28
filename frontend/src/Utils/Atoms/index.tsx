import { HubConnection } from "@microsoft/signalr"
import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export const lastLoggedInUsernameAtom = atomWithStorage<string | null>("lastLoggedInUsername", null, undefined, { getOnInit: true })
export const lastRememberMeCheckedAtom = atomWithStorage<boolean>("lastRememberMeChecked", false, undefined, { getOnInit: true })

export const signalRConnectionAtom = atom<HubConnection | undefined>(undefined)


export type QuickRegistrationMode = "createAndMove" | "createAndEdit"
export const quickRegistrationModeAtom = atomWithStorage<QuickRegistrationMode | null>("quickRegistrationMode", "createAndEdit", undefined, { getOnInit: true })
export const quickRegistrationToolWindowIsOpenAtom = atomWithStorage<boolean>("quickRegistrationToolWindowIsOpen", true, undefined, { getOnInit: true })

export const quickEditToolWindowIsOpenAtom = atomWithStorage<boolean>("quickEditToolWindowIsOpen", true, undefined, { getOnInit: true })