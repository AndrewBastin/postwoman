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

  private handleIDTicker = 0

  private collectionHandleToFolderPath = reactive(
    new Map<RESTCollectionHandle, string>()
  )
  private requestHandleToFolderPath = reactive(
    new Map<RESTRequestHandle, string>()
  )

  private state = useReadonlyStream(
    restCollectionStore.subject$,
    restCollectionStore.value
  )

  public override onServiceInit() {
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

  private moveFolder(srcFolderPath: string, destFolderPath: string | null) {
    // Parse source and destination paths
    const srcIndices = srcFolderPath.split("/").map(Number)
    const destIndices = destFolderPath?.split("/").map(Number)

    // Update collection handles
    for (const [handle, path] of this.collectionHandleToFolderPath.entries()) {
      const pathIndices = path.split("/").map(Number)

      if (
        pathIndices.length >= srcIndices.length &&
        pathIndices
          .slice(0, srcIndices.length)
          .every((v, i) => v === srcIndices[i])
      ) {
        // This is the moved folder or its subfolder
        const newPath = destFolderPath
          ? [...destIndices!, ...pathIndices.slice(srcIndices.length - 1)].join(
              "/"
            )
          : pathIndices.slice(srcIndices.length - 1).join("/")

        this.collectionHandleToFolderPath.set(handle, newPath)
      }
    }

    // Update request handles
    for (const [handle, path] of this.requestHandleToFolderPath.entries()) {
      const pathIndices = path.split("/").map(Number)

      if (
        pathIndices.length > srcIndices.length &&
        pathIndices
          .slice(0, srcIndices.length)
          .every((v, i) => v === srcIndices[i])
      ) {
        // This is a request within the moved folder
        const newPath = destFolderPath
          ? [...destIndices!, ...pathIndices.slice(srcIndices.length - 1)].join(
              "/"
            )
          : pathIndices.slice(srcIndices.length - 1).join("/")
        this.requestHandleToFolderPath.set(handle, newPath)
      }
    }
  }

  // eslint-disable-next-line
  private moveRequest(_srcFolderPath: string, _destFolderPath: string) {
    // Update handle maps for folders effected by move
    // Update handle maps for requests effected by move
    throw new Error("TODO: Implement")
  }

  public getWorkspace(handle: WorkspaceHandle): Resource<WorkspaceMeta> {
    if (handle !== PERSONAL_WORKSPACE_HANDLE) {
      return { type: "error", error: new Error("Invalid workspace") }
    }

    return { type: "available", data: { name: "Personal Workspace" } }
  }

  private getOrIssueRESTCollectionHandleForFolderPath(
    path: string
  ): RESTCollectionHandle {
    for (const [handle, folderPath] of this.collectionHandleToFolderPath) {
      if (folderPath === path) {
        return handle
      }
    }

    const issuedHandle = `${++this.handleIDTicker}` as RESTCollectionHandle
    this.collectionHandleToFolderPath.set(issuedHandle, path)

    return issuedHandle
  }

  private getOrIssueRESTRequestHandleForFolderPath(
    path: string
  ): RESTRequestHandle {
    for (const [handle, folderPath] of this.requestHandleToFolderPath) {
      if (folderPath === path) {
        return handle
      }
    }

    const issuedHandle = `${++this.handleIDTicker}` as RESTRequestHandle
    this.requestHandleToFolderPath.set(issuedHandle, path)

    return issuedHandle
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
          handle: this.getOrIssueRESTCollectionHandleForFolderPath(`${index}`),
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
    const folderPath = this.collectionHandleToFolderPath.get(handle)

    if (!folderPath) {
      return { type: "unavailable" }
    }

    const coll = navigateToFolderWithIndexPath(
      this.state.value.state,
      folderPath.split("/").map(Number)
    )

    if (!coll) {
      return { type: "unavailable" }
    }

    return {
      type: "available",
      data: {
        folders: coll.folders.map((child, index) => {
          return {
            handle: this.getOrIssueRESTCollectionHandleForFolderPath(
              `${folderPath}/${index}`
            ),
            data: {
              name: child.name,
            },
          }
        }),
        requests: coll.requests.map((req, index) => {
          return {
            handle: this.getOrIssueRESTRequestHandleForFolderPath(
              `${folderPath}/${index}`
            ),
            data: {
              name: req.name,
            },
          }
        }),
      },
    }
  }
}
