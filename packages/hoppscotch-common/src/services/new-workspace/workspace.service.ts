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
}

export const PERSONAL_WORKSPACE_HANDLE = "personal" as WorkspaceHandle

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
    this.generateHandlesForAllCollectionsAndRequests()

    // Listen for state changes
    restCollectionStore.dispatches$.subscribe((dispatch) => {
      switch (dispatch.dispatcher) {
        case "moveFolder":
          this.moveFolder(
            dispatch.payload.path,
            dispatch.payload.destinationPath
          )
          break

        case "moveRequest":
          this.moveRequest(
            `${dispatch.payload.path}/${dispatch.payload.requestIndex}`,
            dispatch.payload.destinationPath
          )
          break
      }
    })
  }

  private generateHandlesForAllCollectionsAndRequests() {
    const stack: [any[], RESTCollectionHandle | null][] = [
      [this.state.value.state, null],
    ]

    while (stack.length > 0) {
      const [collections, parentHandle] = stack.pop()!

      for (const [index, collection] of collections.entries()) {
        const collectionHandle = this.getOrCreateAssociatedRESTCollectionHandle(
          parentHandle,
          index
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

  private moveFolder(srcFolderPath: string, destFolderPath: string | null) {
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

  private moveRequest(srcFolderPath: string, destFolderPath: string) {
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
    let result = this.getAssociatedRESTCollectionHandle(parent, index)

    if (result === null) {
      result = `${this.handleIDTicker++}` as RESTCollectionHandle

      this.collectionHandleToParentIndex.set(result, [parent, index])
    }

    return result
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
    let result = this.getAssociatedRESTRequestHandle(parent, index)

    if (result === null) {
      result = `${this.handleIDTicker++}` as RESTRequestHandle

      this.requestHandleToParentIndex.set(result, [parent, index])
    }

    return result
  }

  private resolveIndexPathFromRESTCollectionHandle(
    handle: RESTCollectionHandle
  ): number[] {
    const parents: Array<number> = []

    let current: RESTCollectionHandle | null = handle

    while (current !== null) {
      // We can expect handle entries to be present
      const [parentHandle, index]: [RESTCollectionHandle | null, number] =
        this.collectionHandleToParentIndex.get(current)!

      parents.push(index)

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
    const folderHandle =
      this.resolveRESTCollectionHandleFromFolderPath(folderPath)

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
}
