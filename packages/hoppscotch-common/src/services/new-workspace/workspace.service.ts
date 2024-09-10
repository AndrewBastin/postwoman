import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Service } from "dioc"
import { ref, Ref, shallowReactive } from "vue"
import { Brand } from "~/types/ts-utils"

/**
 * A branded unique identifier for a workspace. Only cast to this type within
 * a workspace provider. Values of this type should not be considered as persistable.
 */
export type WorkspaceHandle = Brand<string, "WorkspaceHandle">

/**
 * A branded unique identifier for a workspace REST Collection. Only cast to this type
 * within a workspace provider. Values of this type should not be considered as persistable.
 */
export type RESTCollectionHandle = Brand<string, "RESTCollectionHandle">

/**
 * A branded unique identifier for a workspace REST Request. Only cast to this type
 * within a workspace provider. Valujes of this type should not be considered as persistable.
 */
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
  method: string
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

export type CreateRESTCollectionInput = {
  name: string
  headers?: HoppCollection["headers"]
  auth?: HoppCollection["auth"]
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
  /**
   * A unique identifier for the provider. This value should be a constant
   * and is deemed to be persistable. You may need to cast the string to the ProviderID type,
   * if you are defining a provider. DO NOT CAST TO THE ProviderID TYPE in other cases.
   */
  providerID: ProviderID

  /**
   * [REACTIVE GETTER] Resolves a workspace handle and return the metadata
   * corresponding to the workspace referred by the handle.
   */
  getWorkspace(handle: WorkspaceHandle): Resource<WorkspaceMeta>

  /**
   * [REACTIVE GETTER] Resolves the root REST collections for a workspace.
   */
  getRootRESTCollections(handle: WorkspaceHandle): Resource<RootRESTCollections>

  /**
   * [REACTIVE GETTER] Resolves the children of a REST collection referred
   * to by the handle.
   */
  getRESTCollectionChildren(
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren>

  /**
   * [REACTIVE GETTER] Resolves the request data for a REST request referred
   * to by the handle.
   */
  getRESTRequest(handle: RESTRequestHandle): Resource<HoppRESTRequest>

  /**
   * Creates a REST collection in the given workspace.
   *
   * @param workspace A handle to the workspace where the collection should be created
   * @param parent A handle to the collection where the collection should be created under, or null if it should be in the root
   * @param input Information about how the collection should be created (name etc.)
   *
   * @returns A promise to a handle referring to the collection that was created
   */
  createRESTCollection(
    workspace: WorkspaceHandle,
    parent: RESTCollectionHandle | null,
    input: CreateRESTCollectionInput
  ): Promise<RESTCollectionHandle>

  /**
   * Creates a REST request in the given workspace.
   *
   * @param workspace A handle to the workspace where the request should be created
   * @param parent A handle to the collection where the request should be created
   * @param input The contents of the request
   */
  createRESTRequest(
    workspace: WorkspaceHandle,
    parent: RESTCollectionHandle,
    req: HoppRESTRequest
  ): Promise<RESTRequestHandle>

  /**
   * Deletes a given REST request
   *
   * @param handle The handle of the request to be deleted
   */
  deleteRESTRequest(handle: RESTRequestHandle): Promise<void>

  /**
   * Deletes a given REST collection
   *
   * @param handle The handle of the collection to be deleted
   */
  deleteRESTCollection(handle: RESTCollectionHandle): Promise<void>
}

/**
 * This service deals with the management and access of workspaces and
 * workspace owned resources.
 */
export class NewWorkspaceService extends Service {
  public static readonly ID = "NEW_WORKSPACE_SERVICE"

  private providerMap: Map<ProviderID, WorkspaceProvider> = shallowReactive(
    new Map()
  )

  public currentWorkspace: Ref<{
    provider: ProviderID
    handle: WorkspaceHandle
  } | null> = ref(null)

  /**
   * Registers a workspace provider with the service. This allows
   * for the user to access resources from the provider.
   */
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

  /**
   * A helper function to resolve a provider from the provider ID.
   * If the provider is not found, an error is thrown.
   */
  private resolveProvider(provider: ProviderID) {
    const resolvedProvider = this.providerMap.get(provider)

    if (!resolvedProvider) {
      throw new Error(`Provider not found: ${provider}`)
    }

    return resolvedProvider
  }

  public getWorkspace(
    provider: ProviderID,
    handle: WorkspaceHandle
  ): Resource<WorkspaceMeta> {
    return this.resolveProvider(provider).getWorkspace(handle)
  }

  public getRootRESTCollections(
    provider: ProviderID,
    handle: WorkspaceHandle
  ): Resource<RootRESTCollections> {
    return this.resolveProvider(provider).getRootRESTCollections(handle)
  }

  public getRESTCollectionChildren(
    provider: ProviderID,
    handle: RESTCollectionHandle
  ): Resource<RESTCollectionChildren> {
    return this.resolveProvider(provider).getRESTCollectionChildren(handle)
  }

  public getRESTRequest(
    provider: ProviderID,
    handle: RESTRequestHandle
  ): Resource<HoppRESTRequest> {
    return this.resolveProvider(provider).getRESTRequest(handle)
  }

  public createRESTCollection(
    provider: ProviderID,
    workspace: WorkspaceHandle,
    parent: RESTCollectionHandle | null,
    input: CreateRESTCollectionInput
  ): Promise<RESTCollectionHandle> {
    return this.resolveProvider(provider).createRESTCollection(
      workspace,
      parent,
      input
    )
  }

  public createRESTRequest(
    provider: ProviderID,
    workspace: WorkspaceHandle,
    parent: RESTCollectionHandle,
    input: HoppRESTRequest
  ): Promise<RESTRequestHandle> {
    return this.resolveProvider(provider).createRESTRequest(
      workspace,
      parent,
      input
    )
  }

  public deleteRESTRequest(
    provider: ProviderID,
    handle: RESTRequestHandle
  ): Promise<void> {
    return this.resolveProvider(provider).deleteRESTRequest(handle)
  }

  public deleteRESTCollection(
    provider: ProviderID,
    handle: RESTCollectionHandle
  ): Promise<void> {
    return this.resolveProvider(provider).deleteRESTCollection(handle)
  }
}
