<template>
  <div>
    <HoppSmartTree :adapter="adapter">
      <template #content="{ node, toggleChildren, isOpen }">
        <div
          v-if="node.data.type === 'collection' || node.data.type === 'folder'"
          class="flex gap-x-2"
          @click="() => toggleChildren()"
        >
          <span>
            {{ isOpen ? "-" : "+" }}
          </span>
          <span
            >[{{
              node.data.type === "collection" ? "Collection" : "Folder"
            }}]</span
          >
          <span>{{ node.data.name }}</span>
          <span>Handle: {{ node.data.handle }}</span>
        </div>
        <div v-else-if="node.data.type === 'request'" class="flex gap-x-2">
          <span>[Request]</span>
          <span>{{ node.data.name }}</span>
          <span>Handle: {{ node.data.handle }}</span>
        </div>
      </template>
    </HoppSmartTree>
  </div>
</template>

<script lang="ts">
type CollectionNode =
  | {
      type: "folder" | "collection"
      handle: RESTCollectionHandle
      name: string
    }
  | { type: "request"; handle: RESTRequestHandle; name: string }

class WorkspaceCollectionAdapter implements SmartTreeAdapter<CollectionNode> {
  constructor(
    private rootCollections: Ref<RootRESTCollections>,
    private personalWorkspace: NewWorkspaceService
  ) {}

  getChildren(nodeID: string | null): Ref<ChildrenResult<CollectionNode>> {
    return computed<ChildrenResult<CollectionNode>>(() => {
      if (nodeID === null) {
        return <ChildrenResult<CollectionNode>>{
          status: "loaded",
          data: this.rootCollections.value.map(
            (coll): TreeNode<CollectionNode> => {
              return {
                id: coll.handle,
                data: {
                  type: "collection",
                  handle: coll.handle,
                  name: coll.data.name,
                },
              }
            }
          ),
        }
      }
      const children = this.personalWorkspace.getRESTCollectionChildren(
        nodeID as RESTCollectionHandle
      )

      if (children.type === "loading") {
        return <ChildrenResult<CollectionNode>>{
          status: "loading",
        }
      }

      if (children.type !== "available") {
        // TODO: Better impl ?
        return <ChildrenResult<CollectionNode>>{
          status: "loaded",
          data: [],
        }
      }

      return <ChildrenResult<CollectionNode>>{
        status: "loaded",
        data: [
          ...children.data.folders.map((coll): TreeNode<CollectionNode> => {
            return {
              id: coll.handle,
              data: {
                type: "collection",
                handle: coll.handle,
                name: coll.data.name,
              },
            }
          }),
          ...children.data.requests.map((req): TreeNode<CollectionNode> => {
            return {
              id: req.handle,
              data: {
                type: "request",
                handle: req.handle,
                name: req.data.name,
              },
            }
          }),
        ],
      }
    })
  }
}
</script>

<script setup lang="ts">
import { ChildrenResult, SmartTreeAdapter, TreeNode } from "@hoppscotch/ui"
import { useService } from "dioc/vue"
import { Ref } from "vue"
import { computed } from "vue"
import {
  NewWorkspaceService,
  PERSONAL_WORKSPACE_HANDLE,
  RESTCollectionHandle,
  RESTRequestHandle,
  RootRESTCollections,
} from "~/services/new-workspace/workspace.service"

const personalWorkspace = useService(NewWorkspaceService)

const rootCollections = computed(() => {
  const colls = personalWorkspace.getRootRESTCollections(
    PERSONAL_WORKSPACE_HANDLE
  )

  if (colls.type !== "available") {
    return []
  }
  return colls.data
})

const adapter: SmartTreeAdapter<CollectionNode> =
  new WorkspaceCollectionAdapter(rootCollections, personalWorkspace)
</script>
