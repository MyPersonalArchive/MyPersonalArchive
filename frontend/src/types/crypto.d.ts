// Minimal ambient declaration so that `import { UUID } from "crypto"` works in
// browser code without pulling in the full @types/node typings.
declare module "crypto" {
	export type UUID = `${string}-${string}-${string}-${string}-${string}`
}
