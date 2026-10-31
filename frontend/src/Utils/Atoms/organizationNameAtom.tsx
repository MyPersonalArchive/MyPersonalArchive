import { atom } from "jotai"


// Cached per tenant, so a different signed in user won't see a stale name
export const organizationNameAtom = atom<{ tenantId: string, name: string } | undefined>(undefined)
