import { AuthPlatformDef } from "./auth"
import { UIPlatformDef } from "./ui"
import { SyncPlatformDef } from "./sync"

export type PlatformDef = {
  ui?: UIPlatformDef
  auth: AuthPlatformDef
  sync: SyncPlatformDef
}

export let platform: PlatformDef

export function setPlatformDef(def: PlatformDef) {
  platform = def
}
