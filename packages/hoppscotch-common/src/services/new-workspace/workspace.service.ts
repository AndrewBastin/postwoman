import { HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { reactive } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import {
  navigateToFolderWithIndexPath,
  restCollectionStore,
} from "~/newstore/collections"
import { Brand } from "~/types/ts-utils"

export type WorkspaceHandle = Brand<string, "WorkspaceHandle">

export type RESTCollectionHandle = Brand<string, "RESTCollectionHandle">

export type RESTRequestHandle = Brand<string, "RESTRequestHandle">

export type Resource<T> =
  | { type: "loading" }
  | { type: "available"; data: T }
  | { type: "unavailable" }
  | { type: "error"; humanError?: string; error: unknown }

export type WorkspaceMeta = {
  name: string
}

export type RESTCollectionMeta = {
  name: string
}

export type RESTRequestMeta = {
  name: string
}

export type RootRESTCollections = Array<{
  handle: RESTCollectionHandle
  data: RESTCollectionMeta
}>

export type RESTCollectionChildren = {
  folders: Array<{
    handle: RESTCollectionHandle
    data: RESTCollectionMeta
  }>
  requests: Array<{
    handle: RESTRequestHandle
    data: RESTRequestMeta
  }>
}

export interface WorkspaceProvider {
  getWorkspace(handle: WorkspaceHandle): Resource<WorkspaceMeta>

  getRootRESTCollections(handle: WorkspaceHandle): Resource<RootRESTCollections>
  getRESTCollectionChildren(
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren>

  getRESTRequest(handle: RESTRequestHandle): Resource<HoppRESTRequest>
}

export const PERSONAL_WORKSPACE_HANDLE = "personal" as WorkspaceHandle

// TODO: Don't try to infer this here, use the actual type (currently just lazy :P)
type StoreRESTCollection = (typeof restCollectionStore.value.state)[number]

export class NewWorkspaceService extends Service implements WorkspaceProvider {
  public static readonly ID = "NEW_WORKSPACE_SERVICE"

  private handleIDTicker = 1

  private collectionHandleToParentIndex = reactive(
    new Map<RESTCollectionHandle, [RESTCollectionHandle | null, number]>()
  )

  private requestHandleToParentIndex = reactive(
    new Map<RESTRequestHandle, [RESTCollectionHandle, number]>()
  )

  private state = useReadonlyStream(
    restCollectionStore.subject$,
    restCollectionStore.value
  )

  public override onServiceInit() {
    this.generateHandlesForCollections(this.state.value.state, 0)

    // Listen for state changes
    restCollectionStore.dispatches$.subscribe((dispatch) => {
      switch (dispatch.dispatcher) {
        case "moveFolder":
          this.handleFolderMove(
            dispatch.payload.path,
            dispatch.payload.destinationPath
          )
          break

        case "moveRequest":
          this.handleRequestMove(
            `${dispatch.payload.path}/${dispatch.payload.requestIndex}`,
            dispatch.payload.destinationPath
          )
          break

        case "addCollection":
          this.handleFolderAdd(null)
          break

        case "addFolder":
          this.handleFolderAdd(dispatch.payload.path)
          break

        case "duplicateCollection":
          this.handleFolderDuplication(dispatch.payload.path)
          break

        case "saveRequestAs":
          this.handleRequestAdd(dispatch.payload.path)
          break

        case "appendCollections":
          this.generateHandlesForCollections(
            dispatch.payload.entries,
            this.state.value.state.length - dispatch.payload.entries.length - 1
          )
          break

        case "removeFolder":
          this.handleFolderRemove(dispatch.payload.path)
          break

        case "removeCollection":
          this.handleFolderRemove(`${dispatch.payload.collectionIndex}`)
          break

        case "removeRequest":
          this.handleRequestRemove(
            dispatch.payload.path,
            dispatch.payload.requestIndex
          )
          break

        case "updateRequestOrder":
          this.handleRequestReorder(
            dispatch.payload.destinationCollectionPath,
            dispatch.payload.requestIndex,
            dispatch.payload.destinationRequestIndex
          )
          break

        case "updateCollectionOrder":
          this.handleFolderReorder(
            dispatch.payload.collectionIndex,
            dispatch.payload.destinationCollectionIndex
          )
          break
      }
    })
  }

  private handleFolderDuplication(folderPath: string) {
    // The game plan for folder duplication
    // 1. Use `generateHandlesForCollections` to generate handles for all the collections and requests inside

    const folderHandle =
      this.resolveRESTCollectionHandleFromFolderPath(folderPath)
    const [parentHandle] = this.collectionHandleToParentIndex.get(folderHandle)!

    if (parentHandle !== null) {
      const indexPath = folderPath.split("/").map(Number)
      indexPath.pop()

      const folder = navigateToFolderWithIndexPath(
        this.state.value.state,
        indexPath
      )!

      const destIndex = folder.folders.length - 1

      this.generateHandlesForCollections(
        [folder.folders[destIndex]],
        destIndex,
        parentHandle
      )
    } else {
      this.generateHandlesForCollections(
        [this.state.value.state[this.state.value.state.length - 1]],
        this.state.value.state.length - 1
      )
    }
  }

  private handleFolderReorder(
    srcFolderPath: string,
    destFolderPath: string | null
  ) {
    // The game plan for folder reorders
    // 1. Update the folder handle to the new position
    // 2. Shift up the indices of the folders in the same folder that come after the moved till the destination

    const srcIndexPath = srcFolderPath.split("/").map(Number)
    const srcFolderIndex = srcIndexPath.pop()!

    const srcParentFolder = navigateToFolderWithIndexPath(
      this.state.value.state,
      [...srcIndexPath] // navigateToFolderWithIndexPath mutates this
    )!
    const destFolderIndex =
      destFolderPath !== null
        ? destFolderPath.split("/").map(Number).pop()!
        : srcParentFolder.folders.length - 1

    // Since we pop the folder index above, if the srcIndexPath is empty, then this is a root collection
    const srcParentHandle =
      srcIndexPath.length !== 0
        ? this.resolveRESTCollectionHandleFromFolderPath(srcFolderPath)
        : null

    for (const [
      folderHandle,
      [parentHandle, index],
    ] of this.collectionHandleToParentIndex.entries()) {
      if (parentHandle === srcParentHandle && index === srcFolderIndex) {
        // Update the folder handle to the new position
        this.collectionHandleToParentIndex.set(folderHandle, [
          parentHandle,
          destFolderIndex,
        ])
      } else if (
        parentHandle === srcParentHandle &&
        index > srcFolderIndex &&
        index <= destFolderIndex
      ) {
        // Shift up the indices of the folders in the same folder that come after the moved till the destination
        this.collectionHandleToParentIndex.set(folderHandle, [
          parentHandle,
          index - 1,
        ])
      }
    }
  }

  private handleRequestReorder(
    destCollectionPath: string,
    srcRequestIndex: number,
    destRequestIndex: number | null
  ) {
    // The game plan for request reorders
    // 1. Update the handle for the request to the new position
    // 2. Shift up the indices of the requests in the same folder that come after the moved till the destination

    const destCollection = navigateToFolderWithIndexPath(
      this.state.value.state,
      destCollectionPath.split("/").map(Number)
    )!
    const destCollectionHandle =
      this.resolveRESTCollectionHandleFromFolderPath(destCollectionPath)
    const actualDestRequestIndex =
      destRequestIndex ?? destCollection.requests.length

    for (const [
      reqHandle,
      [parentHandle, index],
    ] of this.requestHandleToParentIndex.entries()) {
      if (parentHandle === destCollectionHandle && index === srcRequestIndex) {
        // Update the handle for the request to the new position
        this.requestHandleToParentIndex.set(reqHandle, [
          parentHandle,
          destRequestIndex ?? actualDestRequestIndex,
        ])
      } else if (
        parentHandle === destCollectionHandle &&
        index > srcRequestIndex &&
        index <= actualDestRequestIndex
      ) {
        // Shift up the indices of the requests in the same folder that come after the moved till the destination
        this.requestHandleToParentIndex.set(reqHandle, [
          parentHandle,
          index - 1,
        ])
      }
    }
  }

  private handleRequestRemove(folderPath: string, requestIndex: number) {
    // The game plan for request moves
    // 1. We remove the request handle from the map
    // 2. We shift up the indexes of the requests in the same folder that come after the removed request

    const reqHandle = this.resolveRESTRequestHandleFromFolderPath(
      `${folderPath}/${requestIndex}`
    )
    const [parentHandle, indexInParent] =
      this.requestHandleToParentIndex.get(reqHandle)!

    // Remove the request handle from the map
    this.requestHandleToParentIndex.delete(reqHandle)

    // Shift up the indexes of the requests in the same folder that come after the removed
    for (const [
      checkedHandle,
      [checkedParentHandle, checkedIndexInParent],
    ] of this.requestHandleToParentIndex.entries()) {
      if (
        checkedParentHandle === parentHandle &&
        checkedIndexInParent > indexInParent
      ) {
        this.requestHandleToParentIndex.set(checkedHandle, [
          checkedParentHandle,
          checkedIndexInParent - 1,
        ])
      }
    }
  }

  private handleFolderRemove(folderPath: string) {
    // The game plan for folder removes
    // 1. We update the parent index of all the siblings of the folder because all folders after the removed will be shifted up 1
    // 2. We remove the immediate children folder of the folder
    // 3. We remove the folder handle from the map
    //
    // NOTE: We don't remove the grand children of the folder because traversing for them will be a more expensive operation
    // because we would have to do [n = depth] passes over the map to clear them all out. Instead they will be removed when a
    // getter tries to resolve their or their children's handles, when they try to build up the folder paths from the handles
    // (see: resolveRESTCollectionHandleFromFolderPath and resolveRESTRequestHandleFromFolderPath). We also do not delete the
    // request handles for the same reason, why traverse over them and increase computation time here again, while the memory
    // savings is pretty less
    //

    const handle = this.resolveRESTCollectionHandleFromFolderPath(folderPath)
    const [parentHandle, indexInParent] =
      this.collectionHandleToParentIndex.get(handle)!

    // Remove the folder handle from the map
    this.collectionHandleToParentIndex.delete(handle)

    // Make a pass over the map to update the parent index of the siblings, add clear the immediate children of the folder as a bonus
    for (const [
      checkedHandle,
      [checkedParentHandle, checkedIndexInParent],
    ] of this.collectionHandleToParentIndex.entries()) {
      // Sibling to the removed folder
      if (
        checkedParentHandle === parentHandle &&
        checkedIndexInParent > indexInParent
      ) {
        this.collectionHandleToParentIndex.set(checkedHandle, [
          checkedParentHandle,
          checkedIndexInParent - 1,
        ])
      } else if (checkedParentHandle === handle) {
        // Child of the removed folder
        this.collectionHandleToParentIndex.delete(checkedHandle)
      }
    }
  }

  private createAssociatedRESTCollectionHandle(
    parentHandle: RESTCollectionHandle | null,
    index: number
  ): RESTCollectionHandle {
    const handle = `${this.handleIDTicker++}` as RESTCollectionHandle

    this.collectionHandleToParentIndex.set(handle, [parentHandle, index])

    return handle
  }

  private createAssociatedRESTRequestHandle(
    parentHandle: RESTCollectionHandle,
    requestIndex: number
  ): RESTRequestHandle {
    const handle = `${this.handleIDTicker++}` as RESTRequestHandle

    this.requestHandleToParentIndex.set(handle, [parentHandle, requestIndex])

    return handle
  }

  private generateHandlesForCollections(
    colls: StoreRESTCollection[],
    startingPointIndex: number,
    parentCollHandle: RESTCollectionHandle | null = null
  ) {
    const stack: [StoreRESTCollection[], RESTCollectionHandle | null][] = [
      [colls, parentCollHandle],
    ]

    while (stack.length > 0) {
      const [collections, parentHandle] = stack.pop()!

      for (const [index, collection] of collections.entries()) {
        const collectionHandle = this.getOrCreateAssociatedRESTCollectionHandle(
          parentHandle,
          index + startingPointIndex
        )

        // Generate handles for requests in this collection
        for (const [requestIndex] of collection.requests.entries()) {
          this.getOrCreateAssociatedRESTRequestHandle(
            collectionHandle,
            requestIndex
          )
        }

        // Add nested folders to the stack
        if (collection.folders && collection.folders.length > 0) {
          stack.push([collection.folders, collectionHandle])
        }
      }
    }
  }

  private handleFolderAdd(parentFolderPath: string | null) {
    const parentHandle = parentFolderPath
      ? this.resolveRESTCollectionHandleFromFolderPath(parentFolderPath)
      : null

    const folderIndex = parentFolderPath
      ? navigateToFolderWithIndexPath(
          this.state.value.state,
          parentFolderPath.split("/").map(Number)
        )!.folders.length - 1
      : this.state.value.state.length - 1

    this.createAssociatedRESTCollectionHandle(parentHandle, folderIndex)
  }

  private handleRequestAdd(parentFolderPath: string) {
    const parentHandle =
      this.resolveRESTCollectionHandleFromFolderPath(parentFolderPath)

    const requestIndex =
      navigateToFolderWithIndexPath(
        this.state.value.state,
        parentFolderPath.split("/").map(Number)
      )!.requests.length - 1

    const handle = `${this.handleIDTicker++}` as RESTRequestHandle

    this.requestHandleToParentIndex.set(handle, [parentHandle, requestIndex])
  }

  private handleFolderMove(
    srcFolderPath: string,
    destFolderPath: string | null
  ) {
    const destHandle: RESTCollectionHandle | null = destFolderPath
      ? this.resolveRESTCollectionHandleFromFolderPath(destFolderPath)
      : null

    const destPosition = destFolderPath
      ? navigateToFolderWithIndexPath(
          this.state.value.state,
          destFolderPath.split("/").map(Number)
        )!.folders.length - 1
      : this.state.value.state.length - 1

    const srcHandle: RESTCollectionHandle =
      this.resolveRESTCollectionHandleFromFolderPath(srcFolderPath)
    const [srcParentHandle, srcParentIndex] =
      this.collectionHandleToParentIndex.get(srcHandle)!

    for (const [
      handle,
      [parentHandle, parentIndex],
    ] of this.collectionHandleToParentIndex.entries()) {
      if (handle === srcHandle) {
        this.collectionHandleToParentIndex.set(handle, [
          destHandle,
          destPosition,
        ])
      }

      if (parentHandle === srcParentHandle && parentIndex > srcParentIndex) {
        this.collectionHandleToParentIndex.set(handle, [
          parentHandle,
          parentIndex - 1,
        ])
      }
    }
  }

  private handleRequestMove(srcFolderPath: string, destFolderPath: string) {
    const destHandle: RESTCollectionHandle | null =
      this.resolveRESTCollectionHandleFromFolderPath(destFolderPath)
    const destPosition =
      navigateToFolderWithIndexPath(
        this.state.value.state,
        destFolderPath.split("/").map(Number)
      )!.requests.length - 1

    const srcHandle: RESTRequestHandle =
      this.resolveRESTRequestHandleFromFolderPath(srcFolderPath)
    const [srcParentHandle, srcParentIndex] =
      this.requestHandleToParentIndex.get(srcHandle)!

    for (const [
      handle,
      [parentHandle, parentIndex],
    ] of this.requestHandleToParentIndex.entries()) {
      if (handle === srcHandle) {
        this.requestHandleToParentIndex.set(handle, [destHandle, destPosition])
      } else if (
        parentHandle === srcParentHandle &&
        parentIndex > srcParentIndex
      ) {
        this.requestHandleToParentIndex.set(handle, [
          parentHandle,
          parentIndex - 1,
        ])
      }
    }
  }

  public getWorkspace(handle: WorkspaceHandle): Resource<WorkspaceMeta> {
    if (handle !== PERSONAL_WORKSPACE_HANDLE) {
      return { type: "error", error: new Error("Invalid workspace") }
    }

    return { type: "available", data: { name: "Personal Workspace" } }
  }

  private getAssociatedRESTCollectionHandle(
    parent: RESTCollectionHandle | null,
    index: number
  ): RESTCollectionHandle | null {
    let result: RESTCollectionHandle | null = null

    for (const [
      handle,
      [parentHandle, parentIndex],
    ] of this.collectionHandleToParentIndex.entries()) {
      if (parent === parentHandle && parentIndex === index) {
        result = handle

        break
      }
    }

    return result
  }

  private getOrCreateAssociatedRESTCollectionHandle(
    parent: RESTCollectionHandle | null,
    index: number
  ): RESTCollectionHandle {
    return (
      this.getAssociatedRESTCollectionHandle(parent, index) ??
      this.createAssociatedRESTCollectionHandle(parent, index)
    )
  }

  private getAssociatedRESTRequestHandle(
    parent: RESTCollectionHandle,
    index: number
  ): RESTRequestHandle | null {
    let result: RESTRequestHandle | null = null

    for (const [
      reqHandle,
      [parentHandle, parentIndex],
    ] of this.requestHandleToParentIndex.entries()) {
      if (parent === parentHandle && parentIndex === index) {
        result = reqHandle

        break
      }
    }

    return result
  }

  private getOrCreateAssociatedRESTRequestHandle(
    parent: RESTCollectionHandle,
    index: number
  ): RESTRequestHandle {
    return (
      this.getAssociatedRESTRequestHandle(parent, index) ??
      this.createAssociatedRESTRequestHandle(parent, index)
    )
  }

  // If this returns null that means, the collection was invalidated somehow
  // probably this collection doesn't exist anymore (either because it was removed or its parents were removed)
  private resolveIndexPathFromRESTCollectionHandle(
    handle: RESTCollectionHandle
  ): number[] | null {
    const parents: number[] = []

    const visitedHandles: RESTCollectionHandle[] = []

    let current: RESTCollectionHandle | null = handle

    while (current !== null) {
      const entry = this.collectionHandleToParentIndex.get(current)

      // If the entry is invalid, then the collection was removed, then all the visited handles are invalid, so lets clear them
      if (entry === undefined) {
        this.collectionHandleToParentIndex.delete(current)

        for (const visitedHandle of visitedHandles) {
          this.collectionHandleToParentIndex.delete(visitedHandle)
        }

        return null
      }

      const [parentHandle, index] = entry

      parents.push(index)
      visitedHandles.push(current)

      current = parentHandle
    }

    return parents.reverse()
  }

  // If this returns null that means, the collection was invalidated somehow
  // probably this collection doesn't exist anymore (either because it was removed or its parents were removed)
  private resolveIndexPathFromRESTRequestHandle(
    handle: RESTRequestHandle
  ): number[] | null {
    const entry = this.requestHandleToParentIndex.get(handle)

    if (entry === undefined) {
      return null
    }

    const [parentHandle, index] = entry

    // The last index in the index path will be the request index
    const parents: number[] = [index]

    const visitedHandles: RESTCollectionHandle[] = []

    let current: RESTCollectionHandle | null = parentHandle

    while (current !== null) {
      const collEntry = this.collectionHandleToParentIndex.get(current)

      // If the entry is invalid, then the collection was removed, then all the visited handles are invalid, so lets clear them and delete this handle too
      if (collEntry === undefined) {
        this.collectionHandleToParentIndex.delete(current)

        // Delete the visited handles because their ancestor was removed
        for (const visitedHandle of visitedHandles) {
          this.collectionHandleToParentIndex.delete(visitedHandle)
        }

        // Delete the request because its ancestor was removed
        this.requestHandleToParentIndex.delete(handle)

        return null
      }

      const [parentHandle, index] = collEntry

      parents.push(index)
      visitedHandles.push(current)

      current = parentHandle
    }

    return parents.reverse()
  }

  private resolveRESTCollectionHandleFromFolderPath(
    folderPath: string
  ): RESTCollectionHandle {
    const path = folderPath.split("/").map(Number)

    let current: RESTCollectionHandle | null = null

    for (const index of path) {
      current = this.getAssociatedRESTCollectionHandle(current, index)!
    }

    return current!
  }

  private resolveRESTRequestHandleFromFolderPath(
    folderPath: string
  ): RESTRequestHandle {
    const requestIndex = folderPath.split("/").map(Number).at(-1)!

    const folderPathWithoutRequest = folderPath
      .split("/")
      .slice(0, -1)
      .join("/")

    const folderHandle = this.resolveRESTCollectionHandleFromFolderPath(
      folderPathWithoutRequest
    )

    return this.getAssociatedRESTRequestHandle(folderHandle, requestIndex)!
  }

  public getRootRESTCollections(
    handle: WorkspaceHandle
  ): Resource<RootRESTCollections> {
    if (handle !== PERSONAL_WORKSPACE_HANDLE) {
      return { type: "error", error: new Error("Invalid workspace") }
    }

    return {
      type: "available",
      data: this.state.value.state.map((coll, index) => {
        return {
          handle: this.getOrCreateAssociatedRESTCollectionHandle(null, index),
          data: {
            name: coll.name,
          },
        }
      }),
    }
  }

  public getRESTCollectionChildren(
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren> {
    const folderPath = this.resolveIndexPathFromRESTCollectionHandle(handle)

    // If the folderPath is null, that means the collection was removed
    if (folderPath === null) {
      return { type: "unavailable" }
    }

    const coll = navigateToFolderWithIndexPath(
      this.state.value.state,
      folderPath
    )!

    return {
      type: "available",
      data: {
        folders: coll.folders.map((coll, index) => {
          return {
            handle: this.getOrCreateAssociatedRESTCollectionHandle(
              handle,
              index
            ),
            data: {
              name: coll.name,
            },
          }
        }),
        requests: coll.requests.map((req, index) => {
          return {
            handle: this.getOrCreateAssociatedRESTRequestHandle(handle, index),
            data: {
              name: req.name,
            },
          }
        }),
      },
    }
  }

  public getRESTRequest(handle: RESTRequestHandle): Resource<HoppRESTRequest> {
    const indexPath = this.resolveIndexPathFromRESTRequestHandle(handle)

    if (indexPath === null) {
      return { type: "unavailable" }
    }

    const requestIndex = indexPath.pop()! // NOTE: This mutates indexPath and makes it a proper folder path

    const parentFolder = navigateToFolderWithIndexPath(
      this.state.value.state,
      indexPath
    )!
    const request = parentFolder.requests[requestIndex]

    return {
      type: "available",
      data: request as HoppRESTRequest, // TODO: Fix this, weird typing issue created by a messy Zod type
    }
  }
}
