import { HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { reactive } from "vue"
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

/**
 * A branded unique identifier for a provider. Only cast to this type when defining
 * a workspace provider. This value can be persisted and should generally remain as constants
 */
export type ProviderID = Brand<string, "ProviderID">

/**
 * Defines the contract that a workspace provider must adhere to.
 *
 * As a gist, a workspace provider is responsible for the following:
 *   - Issuing *unique* handles for workspaces, collections and requests
 *   - Maintaining a mapping between the resource and the handles across operations
 *   - Providing operations to load resource data from handles
 *   - Providing operations to persist and load restorable handles
 *   - DOING ALL THE ABOVE AGAINST REACTIVE STORES SO THE GETTERS ARE REACTIVE GETTERS
 */
export interface WorkspaceProvider {
  providerID: ProviderID

  getWorkspace(handle: WorkspaceHandle): Resource<WorkspaceMeta>

  getRootRESTCollections(handle: WorkspaceHandle): Resource<RootRESTCollections>
  getRESTCollectionChildren(
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren>

  getRESTRequest(handle: RESTRequestHandle): Resource<HoppRESTRequest>
}

export class NewWorkspaceService extends Service {
  public static readonly ID = "NEW_WORKSPACE_SERVICE"

  private providerMap: Map<ProviderID, WorkspaceProvider> = reactive(new Map())

  public registerWorkspaceProvider(provider: WorkspaceProvider) {
    if (this.providerMap.has(provider.providerID)) {
      console.warn(
        "Tried registering a provider that is already registered:",
        provider.providerID
      )
      return
    }

    this.providerMap.set(provider.providerID, provider)
  }

  public getWorkspace(
    provider: ProviderID,
    handle: WorkspaceHandle
  ): Resource<WorkspaceMeta> {
    const resolvedProvider = this.providerMap.get(provider)

    if (!resolvedProvider) {
      throw new Error(`Provider not found: ${provider}`)
    }

    return resolvedProvider.getWorkspace(handle)
  }

  public getRootRESTCollections(
    provider: ProviderID,
    handle: WorkspaceHandle
  ): Resource<RootRESTCollections> {
    const resolvedProvider = this.providerMap.get(provider)

    if (!resolvedProvider) {
      throw new Error(`Provider not found: ${provider}`)
    }

    return resolvedProvider.getRootRESTCollections(handle)
  }

  public getRESTCollectionChildren(
    provider: ProviderID,
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren> {
    const resolvedProvider = this.providerMap.get(provider)

    if (!resolvedProvider) {
      throw new Error(`Provider not found: ${provider}`)
    }

    return resolvedProvider.getRESTCollectionChildren(handle)
  }

  public getRESTRequest(
    provider: ProviderID,
    handle: RESTRequestHandle
  ): Resource<HoppRESTRequest> {
    const resolvedProvider = this.providerMap.get(provider)

    if (!resolvedProvider) {
      throw new Error(`Provider not found: ${provider}`)
    }

    return resolvedProvider.getRESTRequest(handle)
  }
}
