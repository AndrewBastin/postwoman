import {
  RESTCollectionStoreDef,
  GraphqlCollectionStoreDef,
} from "~/newstore/collections"
import { SettingsStoreDef } from "~/newstore/settings"

export type SyncCollectionsPlatformDef = {
  /**
   * Called when the user collection sync system should be initialized
   */
  performCollectionsSyncInit: (
    restCollectionStore: RESTCollectionStoreDef,
    gqlCollectionStore: GraphqlCollectionStoreDef,
    settingsStore: SettingsStoreDef
  ) => void
}
