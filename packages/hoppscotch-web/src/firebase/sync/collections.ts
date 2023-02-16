import {
  RESTCollectionStoreDef,
  GraphqlCollectionStoreDef,
} from "@hoppscotch/common/newstore/collections"
import { SettingsStoreDef } from "@hoppscotch/common/newstore/settings"
import { SyncCollectionsPlatformDef } from "@hoppscotch/common/platform/sync/collections"
import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
  translateToNewRESTCollection,
  translateToNewGQLCollection,
} from "@hoppscotch/data"
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  setDoc,
} from "firebase/firestore"
import { distinctUntilChanged, pluck } from "rxjs"
import { def as auth } from "../auth"

/**
 * Whether the collections are loaded. If this is set to true
 * Updates to the collections store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedRESTCollections = false

/**
 * Whether the collections are loaded. If this is set to true
 * Updates to the collections store are written into firebase.
 *
 * If you have want to update the store and not fire the store update
 * subscription, set this variable to false, do the update and then
 * set it to true
 */
let loadedGraphqlCollections = false

type WriteCollectionParam =
  | { type: "rest"; collections: Array<HoppCollection<HoppRESTRequest>> }
  | { type: "graphql"; collections: Array<HoppCollection<HoppGQLRequest>> }

export async function writeCollections({
  type,
  collections,
}: WriteCollectionParam) {
  const currentUser = auth.getCurrentUser()

  if (currentUser === null)
    throw new Error("User not logged in to write collections")

  const cl = {
    updatedOn: new Date(),
    auth: currentUser.uid,
    author_name: currentUser.displayName,
    author_image: currentUser.photoURL,

    // NOTE: Yes, this is intentionally like this
    collection: collections,
  }

  const collectionPath = type === "rest" ? "collections" : "collectionsGraphql"

  try {
    await setDoc(
      doc(getFirestore(), "users", currentUser.uid, collectionPath, "sync"),
      cl
    )
  } catch (e) {
    console.error("error updating", cl, e)
    throw e
  }
}

export const def: SyncCollectionsPlatformDef = {
  performCollectionsSyncInit(
    restCollectionStore: RESTCollectionStoreDef,
    gqlCollectionStore: GraphqlCollectionStoreDef,
    settingsStore: SettingsStoreDef
  ) {
    const currentUser$ = auth.getCurrentUserStream()

    const restCollSub = restCollectionStore.subject$.subscribe(
      ({ state: collections }) => {
        const currentUser = auth.getCurrentUser()

        if (
          loadedRESTCollections &&
          currentUser &&
          settingsStore.value.syncCollections
        ) {
          writeCollections({
            type: "rest",
            collections,
          })
        }
      }
    )

    const gqlCollSub = gqlCollectionStore.subject$.subscribe(
      ({ state: collections }) => {
        const currentUser = auth.getCurrentUser()

        if (
          loadedGraphqlCollections &&
          currentUser &&
          settingsStore.value.syncCollections
        ) {
          writeCollections({
            type: "graphql",
            collections,
          })
        }
      }
    )

    let restSnapshotStop: (() => void) | null = null
    let gqlSnapshotStop: (() => void) | null = null

    const currentUserSub = currentUser$.subscribe((user) => {
      if (!user) {
        if (restSnapshotStop) {
          restSnapshotStop()
          restSnapshotStop = null
        }

        if (gqlSnapshotStop) {
          gqlSnapshotStop()
          gqlSnapshotStop = null
        }
      } else {
        restSnapshotStop = onSnapshot(
          collection(getFirestore(), "users", user.uid, "collections"),
          (collectionsRef) => {
            const collections: any[] = []

            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })

            // Prevent infinite ping-pong of updates
            loadedRESTCollections = false

            // TODO: Wth is with collections[0]
            if (collections.length > 0 && settingsStore.value.syncCollections) {
              const hoppColls = (collections[0].collection ?? []).map(
                translateToNewRESTCollection
              )

              restCollectionStore.dispatch({
                dispatcher: "setCollections",
                payload: {
                  entries: hoppColls,
                },
              })
            }

            loadedRESTCollections = true
          }
        )

        gqlSnapshotStop = onSnapshot(
          collection(getFirestore(), "users", user.uid, "collectionsGraphql"),
          (collectionsRef) => {
            const collections: any[] = []

            collectionsRef.forEach((doc) => {
              const collection = doc.data()
              collection.id = doc.id
              collections.push(collection)
            })

            // Prevent infinite ping-pong of updates
            loadedGraphqlCollections = false

            // TODO: Wth is with collections[0]
            if (collections.length > 0 && settingsStore.value.syncCollections) {
              const hoppColls = (collections[0].collection ?? []).map(
                translateToNewGQLCollection
              )

              gqlCollectionStore.dispatch({
                dispatcher: "setCollections",
                payload: {
                  entries: hoppColls,
                },
              })
            }

            loadedGraphqlCollections = true
          }
        )
      }
    })

    let oldSyncStatus = settingsStore.value.syncCollections

    const syncStop = settingsStore.subject$
      .pipe(pluck("syncCollections"), distinctUntilChanged())
      .subscribe((newStatus) => {
        if (oldSyncStatus === true && newStatus === false) {
          restSnapshotStop?.()
          gqlSnapshotStop?.()

          oldSyncStatus = newStatus
        } else if (oldSyncStatus === false && newStatus === true) {
          syncStop.unsubscribe()
          restCollSub.unsubscribe()
          gqlCollSub.unsubscribe()
          currentUserSub.unsubscribe()

          this.performCollectionsSyncInit(
            restCollectionStore,
            gqlCollectionStore,
            settingsStore
          )
        }
      })
  },
}
