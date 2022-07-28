<template>
  <!-- A DOM element to specify the Tab ID -->
  <div ref="rootEl" :x-hopp-tab-id="props.id">
    <div
      v-if="shouldRender"
      v-show="active"
      ref="rootEl"
      class="flex flex-col flex-1"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  onMounted,
  onBeforeUnmount,
  inject,
  computed,
  // watch,
  ref,
} from "@nuxtjs/composition-api"
import { TabMeta, TabProvider } from "./Tabs.vue"

const props = defineProps({
  label: { type: String, default: null },
  info: { type: String, default: null },
  indicator: { type: Boolean, default: false },
  icon: { type: String, default: null },
  id: { type: String, default: null, required: true },
  selected: {
    type: Boolean,
    default: false,
  },
})

const rootEl = ref<Element>()

const tabMeta = computed<TabMeta>(() => ({
  icon: props.icon,
  indicator: props.indicator,
  info: props.info,
  label: props.label,
  rootEl: rootEl.value,
}))

const {
  activeTabID,
  renderInactive,
  addTabEntry,
  // updateTabEntry,
  removeTabEntry,
} = inject<TabProvider>("tabs-system")!

const active = computed(() => activeTabID.value === props.id)

const shouldRender = computed(() => {
  // If render inactive is true, then it should be rendered nonetheless
  if (renderInactive.value) return true

  // Else, return whatever is the active state
  return active.value
})

onMounted(() => {
  addTabEntry(props.id, tabMeta)
})

// watch(tabMeta, (newMeta) => {
//   updateTabEntry(props.id, newMeta)
// })

onBeforeUnmount(() => {
  removeTabEntry(props.id)
})
</script>
