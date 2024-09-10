<template>
  <div
    :class="{
      'rounded border border-divider': saveRequest,
      'bg-primaryDark':
        draggingToRoot && currentReorderingStatus.type !== 'request',
    }"
    class="flex-1"
    @drop.prevent="dropToRoot"
    @dragover.prevent="draggingToRoot = true"
    @dragend="draggingToRoot = false"
  >
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto bg-primary border-b border-dividerLight"
      :class="{ 'rounded-t': saveRequest }"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <NewWorkspaceCurrent :section="t('tab.collections')" />
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        class="flex w-full bg-transparent px-4 py-2 h-8"
        :placeholder="t('action.search')"
      />
    </div>
    <div class="flex flex-1 flex-col">
      <div
        class="sticky z-10 flex flex-1 justify-between border-b border-dividerLight bg-primary"
        :style="
          saveRequest
            ? 'top: calc(var(--upper-primary-sticky-fold) - var(--line-height-body))'
            : 'top: var(--upper-primary-sticky-fold)'
        "
      >
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('action.new')"
          class="!rounded-none"
          @click="showAddModalFor = { type: 'collection' }"
        />
        <span class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/documentation/features/collections"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircle"
          />
          <HoppButtonSecondary
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconImport"
            :title="t('modal.import_export')"
            @click="displayModalImportExport(true)"
          />
        </span>
      </div>
      <div>
        <HoppSmartTree :adapter="adapter">
          <template #content="{ node, toggleChildren, isOpen }">
            <!-- TODO: Implement loading state, combines previous exportLoading and duplicateLoading -->
            <!-- TODO: Implement isDraggable, check if the person has team write access -->
            <NewWorkspaceCollectionsCollection
              v-if="
                node.data.type === 'collection' || node.data.type === 'folder'
              "
              :name="node.data.name"
              :is-open="isOpen"
              :is-draggable="true"
              :loading="false"
              @toggle-children="toggleChildren"
            >
              <template #quick-actions>
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconFilePlus"
                  :title="t('request.new')"
                  class="hidden group-hover:inline-flex"
                  @click="showAddRequestModalFor = node.data.handle"
                />
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconFolderPlus"
                  :title="t('folder.new')"
                  class="hidden group-hover:inline-flex"
                  @click="
                    showAddModalFor = {
                      type: 'folder',
                      parentHandle: node.data.handle,
                    }
                  "
                />

                <!-- TODO: Set the v-if to check if this is a team collection -->
                <HoppButtonSecondary
                  v-if="false"
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconPlaySquare"
                  :title="t('collection_runner.run_collection')"
                  class="hidden group-hover:inline-flex"
                />
              </template>

              <template #more-actions="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.r="requestAction?.$el.click()"
                  @keyup.n="folderAction?.$el.click()"
                  @keyup.e="edit?.$el.click()"
                  @keyup.d="
                    showDuplicateCollectionAction
                      ? duplicateAction?.$el.click()
                      : null
                  "
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.x="exportAction?.$el.click()"
                  @keyup.p="propertiesAction?.$el.click()"
                  @keyup.t="runCollectionAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        emit('add-request')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        showAddModalFor = {
                          type: 'folder',
                          parentHandle: node.data.handle,
                        }
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        emit('edit-collection')
                        hide()
                      }
                    "
                  />
                  <!-- TODO: Determine whether to show duplicate collection action, current behaviour is to not show in personal -->
                  <!-- TODO: Handle loading for the duplicate operation -->
                  <HoppSmartItem
                    v-if="false"
                    ref="duplicateAction"
                    :icon="IconCopy"
                    :label="t('action.duplicate')"
                    :loading="false"
                    :shortcut="['D']"
                    @click="
                      () => {
                        emit('duplicate-collection'),
                          collectionsType === 'my-collections' ? hide() : null
                      }
                    "
                  />
                  <!-- TODO: Handle loading for the export operation -->
                  <HoppSmartItem
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    :loading="false"
                    @click="
                      () => {
                        emit('export-data'),
                          collectionsType === 'my-collections' ? hide() : null
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        emit('remove-collection')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="propertiesAction"
                    :icon="IconSettings2"
                    :label="t('action.properties')"
                    :shortcut="['P']"
                    @click="
                      () => {
                        emit('edit-properties')
                        hide()
                      }
                    "
                  />

                  <!-- TODO: Set the v-if to check if this is a team collection -->
                  <HoppSmartItem
                    v-if="false"
                    ref="runCollectionAction"
                    :icon="IconPlaySquare"
                    :label="t('collection_runner.run_collection')"
                    :shortcut="['T']"
                    @click="
                      () => {
                        emit('run-collection', props.id)
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </NewWorkspaceCollectionsCollection>

            <!-- TODO: Integrate loading state, request move loading -->
            <!-- TODO: Integrate isActive, check against the current tab -->
            <!-- TODO: Integrate isSelected, for use in SaveRequest modal -->
            <!-- TODO: Integrate draggable to check against whether team has write access -->
            <NewWorkspaceCollectionsRequest
              v-else-if="node.data.type === 'request'"
              :name="node.data.name"
              :method="node.data.method"
              :loading="false"
              :is-active="false"
              :is-selected="false"
              :draggable="true"
            >
              <template #quick-actions>
                <!-- TODO: Not render this if team has no write access -->
                <!-- TODO: Implement select request -->
                <HoppButtonSecondary
                  v-if="!saveRequest"
                  v-tippy="{ theme: 'tooltip' }"
                  :icon="IconRotateCCW"
                  :title="t('action.restore')"
                  class="hidden group-hover:inline-flex"
                  @click="selectRequest()"
                />
              </template>

              <template #more-actions="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.e="edit?.$el.click()"
                  @keyup.d="duplicate?.$el.click()"
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.s="shareAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        emit('edit-request')
                        hide()
                      }
                    "
                  />
                  <!-- TODO: Integrate loading with duplicate request loading -->
                  <HoppSmartItem
                    ref="duplicate"
                    :icon="IconCopy"
                    :label="t('action.duplicate')"
                    :loading="false"
                    :shortcut="['D']"
                    @click="
                      () => {
                        emit('duplicate-request')
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        emit('remove-request')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="shareAction"
                    :icon="IconShare2"
                    :label="t('action.share')"
                    :shortcut="['S']"
                    @click="
                      () => {
                        emit('share-request')
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </NewWorkspaceCollectionsRequest>
          </template>

          <template #emptyNode="{ node }">
            <!-- Empty Node when searching -->
            <HoppSmartPlaceholder
              v-if="filterText.length !== 0"
              :text="`${t('state.nothing_found')} ‟${filterText}”`"
            >
              <template #icon>
                <icon-lucide-search class="svg-icons opacity-75" />
              </template>
            </HoppSmartPlaceholder>

            <!-- Empty Root Node: Nothing in the tree and not searching -->
            <HoppSmartPlaceholder
              v-else-if="node === null"
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            >
              <template #body>
                <div class="flex flex-col items-center space-y-4">
                  <span class="text-center text-secondaryLight">
                    {{ t("collection.import_or_create") }}
                  </span>
                  <div class="flex flex-col items-stretch gap-4">
                    <HoppButtonPrimary
                      :icon="IconImport"
                      :label="t('import.title')"
                      filled
                      outline
                      @click="displayModalImportExport(true)"
                    />
                    <HoppButtonSecondary
                      :icon="IconPlus"
                      :label="t('add.new')"
                      filled
                      outline
                      @click="
                        showAddModalFor = {
                          type: 'folder',
                          parentHandle: node.data.handle,
                        }
                      "
                    />
                  </div>
                </div>
              </template>
            </HoppSmartPlaceholder>

            <!-- empty collection node and not searching -->
            <HoppSmartPlaceholder
              v-else-if="node.data.type === 'collection'"
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            >
              <template #body>
                <HoppButtonSecondary
                  :label="t('add.new')"
                  filled
                  outline
                  @click="
                    showAddModalFor = {
                      type: 'folder',
                      parentHandle: node.data.handle,
                    }
                  "
                />
              </template>
            </HoppSmartPlaceholder>

            <!-- Empty folder node and not searching -->
            <HoppSmartPlaceholder
              v-else-if="node.data.type === 'folder'"
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.folder')}`"
              :text="t('empty.folder')"
            />
          </template>
        </HoppSmartTree>
      </div>
    </div>
  </div>
  <NewWorkspaceCollectionsAdd
    :show-for="showAddModalFor"
    :loading-state="modalLoading"
    @submit="addNewRootCollection"
    @hide-modal="showAddModalFor = null"
  />

  <NewWorkspaceCollectionsAddRequest
    :show="showAddRequestModalFor !== null"
    :loading-state="modalLoading"
    @add-request="addNewRequest($event, showAddRequestModalFor)"
    @hide-modal="showAddRequestModalFor = null"
  />
</template>

<script lang="ts">
type CollectionNode =
  | {
      type: "folder" | "collection"
      handle: RESTCollectionHandle
      name: string
    }
  | { type: "request"; handle: RESTRequestHandle; name: string; method: string }

class WorkspaceRESTCollectionAdapter
  implements SmartTreeAdapter<CollectionNode>
{
  constructor(
    private workspaceService: NewWorkspaceService,
    private trackedWorkspace: Ref<{
      provider: ProviderID
      handle: WorkspaceHandle
    } | null>
  ) {}

  getChildren(nodeID: string | null): Ref<ChildrenResult<CollectionNode>> {
    return computed<ChildrenResult<CollectionNode>>(() => {
      // Assume a loading status if a workspace is not yet being tracked
      if (this.trackedWorkspace.value === null) {
        return <ChildrenResult<CollectionNode>>{
          status: "loading",
        }
      }

      if (nodeID === null) {
        const rootCollectionsRes = this.workspaceService.getRootRESTCollections(
          this.trackedWorkspace.value.provider,
          this.trackedWorkspace.value.handle
        )

        if (rootCollectionsRes.type === "loading") {
          return <ChildrenResult<CollectionNode>>{
            status: "loading",
          }
        }

        // TODO: Better error handling mechanism ?
        if (rootCollectionsRes.type !== "available") {
          console.error(
            "Root Collections are not available",
            rootCollectionsRes
          )
          throw new Error("Root collections not available")
        }

        return <ChildrenResult<CollectionNode>>{
          status: "loaded",
          data: rootCollectionsRes.data.map(
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

      const children = this.workspaceService.getRESTCollectionChildren(
        this.trackedWorkspace.value.provider,
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
                type: "folder",
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
                method: req.data.method,
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
import { ref, Ref } from "vue"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { currentReorderingStatus$ } from "~/newstore/reordering"
import {
  NewWorkspaceService,
  ProviderID,
  RESTCollectionHandle,
  RESTRequestHandle,
  WorkspaceHandle,
} from "~/services/new-workspace/workspace.service"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconImport from "~icons/lucide/folder-down"
import IconFilePlus from "~icons/lucide/file-plus"
import IconPlaySquare from "~icons/lucide/play-square"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconCopy from "~icons/lucide/copy"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconDownload from "~icons/lucide/download"
import IconSettings2 from "~icons/lucide/settings-2"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconShare2 from "~icons/lucide/share-2"
import { useColorMode } from "~/composables/theming"
import { useToast } from "~/composables/toast"
import { PersonalWorkspaceService } from "~/services/new-workspace/providers/personal.service"
import { AddFor } from "./Add.vue"
import { makeRESTRequest, getDefaultRESTRequest } from "@hoppscotch/data"

withDefaults(
  defineProps<{
    saveRequest: boolean
  }>(),
  {
    saveRequest: false,
  }
)
const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

// Modals
const showAddModalFor = ref<AddFor>(null)
const showAddRequestModalFor = ref<RESTCollectionHandle | null>(null)

const modalLoading = ref(false) // Whether any of the modals are in a loading state

// Dragging
const draggingToRoot = ref(false)
const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

// TODO: Move this to platform definition based loading
useService(PersonalWorkspaceService)

const filterText = ref("")
const workspaceService = useService(NewWorkspaceService)

const adapter: SmartTreeAdapter<CollectionNode> =
  new WorkspaceRESTCollectionAdapter(
    workspaceService,
    workspaceService.currentWorkspace
  )

/**
 * This function is called when the user drops the collection
 * to the root
 * @param payload - object containing the collection index dragged
 */
function dropToRoot({ dataTransfer }: DragEvent) {
  // TODO: Implement
}

function displayModalImportExport(show: boolean) {
  // TODO: Implement
}

async function addNewRootCollection({
  name,
  showFor,
}: {
  name: string
  showFor: NonNullable<AddFor>
}) {
  try {
    modalLoading.value = true

    const currentWorkspace = workspaceService.currentWorkspace.value

    if (currentWorkspace === null) {
      return
    }

    await workspaceService.createRESTCollection(
      currentWorkspace.provider,
      currentWorkspace.handle,
      showFor.type === "collection" ? null : showFor.parentHandle,
      { name }
    )

    // TODO: Handle errors

    toast.success(
      showFor.type === "collection"
        ? t("collection.created")
        : t("folder.created")
    )

    showAddModalFor.value = null
  } finally {
    modalLoading.value = false
  }
}

async function addNewRequest(
  name: string,
  parentHandle: RESTCollectionHandle | null
) {
  if (parentHandle === null) {
    return
  }

  try {
    modalLoading.value = true

    const currentWorkspace = workspaceService.currentWorkspace.value

    if (currentWorkspace === null) {
      return
    }

    await workspaceService.createRESTRequest(
      currentWorkspace.provider,
      currentWorkspace.handle,
      parentHandle,
      makeRESTRequest({
        ...getDefaultRESTRequest(),
        name,
      })
    )

    // TODO: Handle errors

    showAddRequestModalFor.value = null
  } finally {
    modalLoading.value = false
  }
}
</script>
