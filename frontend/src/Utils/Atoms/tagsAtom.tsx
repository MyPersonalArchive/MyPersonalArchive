import { atom } from "jotai"


export const tagsAtom = atom<Set<string>>(new Set<string>())
