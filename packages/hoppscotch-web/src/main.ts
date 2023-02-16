import { createHoppApp } from "@hoppscotch/common"
import { def as authDef } from "./firebase/auth"
import { def as syncCollectionsDef } from "./firebase/sync/collections"

createHoppApp("#app", {
  auth: authDef,
  sync: {
    collections: syncCollectionsDef,
  },
})
