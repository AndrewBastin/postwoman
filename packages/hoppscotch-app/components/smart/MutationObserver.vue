<template>
  <div ref="el">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { useMutationObserver } from "@vueuse/core"

const props = withDefaults(
  defineProps<{
    options?: MutationObserverInit
  }>(),
  {
    options: undefined,
  }
)

const emit = defineEmits<{
  (e: "mutation", muts: MutationRecord[], el: Element): void
}>()

const el = ref<HTMLElement>()

useMutationObserver(
  el,
  (muts) => {
    console.log("mut!")
    emit("mutation", muts, el.value!)
  },
  props.options
)
</script>
