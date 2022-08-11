<template>
  <SmartItem
    :label="label"
    :icon="selected ? ButtonChecked : ButtonUnchecked"
    :active="selected"
    role="radio"
    :aria-checked="selected"
    @click.native="emit('change', value)"
  />
</template>

<script setup lang="ts">
import ButtonChecked from "~icons/mdi/radiobox-marked"
import ButtonUnchecked from "~icons/mdi/radiobox-blank"

defineProps({
  value: {
    type: String,
    default: "",
  },
  label: {
    type: String,
    default: "",
  },
  selected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "change", value: string): void
}>()
</script>
