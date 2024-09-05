<template>
  <div class="flex flex-col">
    <div
      class="h-1 w-full transition"
      :class="[
        {
          'bg-accentDark': isReorderable,
        },
      ]"
      @drop="orderUpdateCollectionEvent"
      @dragover.prevent="ordering = true"
      @dragleave="ordering = false"
      @dragend="resetDragState"
    ></div>
    <div class="relative flex flex-col">
      <div
        class="z-[1] pointer-events-none absolute inset-0 bg-accent opacity-0 transition"
        :class="{
          'opacity-25':
            dragging && notSameDestination && notSameParentDestination,
        }"
      ></div>
      <div
        class="z-[3] group pointer-events-auto relative flex cursor-pointer items-stretch"
        :draggable="isDraggable"
        @dragstart="dragStart"
        @drop="handelDrop($event)"
        @dragover="handleDragOver($event)"
        @dragleave="resetDragState"
        @dragend="
          () => {
            resetDragState()
            dropItemID = ''
          }
        "
        @contextmenu.prevent="options?.tippy?.show()"
      >
        <div
          class="flex min-w-0 flex-1 items-center justify-center"
          @click="emit('toggle-children')"
        >
          <span
            class="pointer-events-none flex items-center justify-center px-4"
          >
            <HoppSmartSpinner v-if="loading" />
            <component
              :is="collectionIcon"
              v-else
              class="svg-icons"
              :class="{ 'text-accent': isSelected }"
            />
          </span>
          <span
            class="pointer-events-none flex min-w-0 flex-1 py-2 pr-2 transition group-hover:text-secondaryDark"
          >
            <span class="truncate" :class="{ 'text-accent': isSelected }">
              {{ name }}
            </span>
          </span>
        </div>
        <div v-if="!hasNoTeamAccess" class="flex">
          <slot name="quick-actions" />
          <span>
            <tippy ref="options" interactive trigger="click" theme="popover">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <slot name="more-actions" :hide="hide" />
              </template>
            </tippy>
          </span>
        </div>
      </div>
    </div>
    <div
      v-if="isLastItem"
      class="w-full transition"
      :class="[
        {
          'bg-accentDark': isLastItemReorderable,
          'h-1 ': isLastItem,
        },
      ]"
      @drop="updateLastItemOrder"
      @dragover.prevent="orderingLastItem = true"
      @dragleave="orderingLastItem = false"
      @dragend="resetDragState"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { computed, ref, watch } from "vue"
import { TippyComponent } from "vue-tippy"
import { useReadonlyStream } from "~/composables/stream"
import {
  changeCurrentReorderStatus,
  currentReorderingStatus$,
} from "~/newstore/reordering"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import IconMoreVertical from "~icons/lucide/more-vertical"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    id: string
    name: string
    loading: boolean
    parentID?: string | null
    isOpen: boolean
    isSelected?: boolean | null
    isLastItem?: boolean
    isDraggable: boolean
  }>(),
  {
    id: "",
    parentID: null,
    isOpen: false,
    isSelected: false,
    hasNoTeamAccess: false,
    isLastItem: false,
  }
)

const emit = defineEmits<{
  (event: "toggle-children"): void
  (event: "add-request"): void
  (event: "add-folder"): void
  (event: "edit-collection"): void
  (event: "edit-properties"): void
  (event: "duplicate-collection"): void
  (event: "export-data"): void
  (event: "remove-collection"): void
  (event: "drop-event", payload: DataTransfer): void
  (event: "drag-event", payload: DataTransfer): void
  (event: "dragging", payload: boolean): void
  (event: "update-collection-order", payload: DataTransfer): void
  (event: "update-last-collection-order", payload: DataTransfer): void
  (event: "run-collection", collectionID: string): void
}>()

const options = ref<TippyComponent | null>(null)

const dragging = ref(false)
const ordering = ref(false)
const orderingLastItem = ref(false)
const dropItemID = ref("")

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

// Used to determine if the collection is being dragged to a different destination
// This is used to make the highlight effect work
watch(
  () => dragging.value,
  (val) => {
    if (val && notSameDestination.value && notSameParentDestination.value) {
      emit("dragging", true)
    } else {
      emit("dragging", false)
    }
  }
)

const collectionIcon = computed(() => {
  if (props.isSelected) return IconCheckCircle
  else if (!props.isOpen) return IconFolder
  else if (props.isOpen) return IconFolderOpen
  return IconFolder
})

const notSameParentDestination = computed(() => {
  return currentReorderingStatus.value.parentID !== props.id
})

const isRequestDragging = computed(() => {
  return currentReorderingStatus.value.type === "request"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isReorderable = computed(() => {
  return (
    ordering.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})
const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    emit("drag-event", dataTransfer)
    dropItemID.value = dataTransfer.getData("collectionIndex")
    dragging.value = !dragging.value
    changeCurrentReorderStatus({
      type: "collection",
      id: props.id,
      parentID: props.parentID,
    })
  }
}

// Trigger the re-ordering event when a collection is dragged over another collection's top section
const handleDragOver = (e: DragEvent) => {
  dragging.value = true
  if (
    e.offsetY < 10 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  ) {
    ordering.value = true
    dragging.value = false
    orderingLastItem.value = false
  } else if (
    e.offsetY > 18 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value &&
    props.isLastItem
  ) {
    orderingLastItem.value = true
    dragging.value = false
    ordering.value = false
  } else {
    ordering.value = false
    orderingLastItem.value = false
  }
}

const handelDrop = (e: DragEvent) => {
  if (ordering.value) {
    orderUpdateCollectionEvent(e)
  } else if (orderingLastItem.value) {
    updateLastItemOrder(e)
  } else {
    notSameParentDestination.value ? dropEvent(e) : e.stopPropagation()
  }
}

const dropEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("drop-event", e.dataTransfer)
    resetDragState()
  }
}

const orderUpdateCollectionEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const updateLastItemOrder = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-last-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const notSameDestination = computed(() => {
  return dropItemID.value !== props.id
})

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
  orderingLastItem.value = false
}
</script>
