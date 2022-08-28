<template>
  <div class="flex items-center justify-between px-4 py-2">
    <div class="flex items-center">
      <component
        :is="getIcon(status)"
        v-tippy="{ theme: 'tooltip' }"
        class="mr-4 svg-icons cursor-help"
        :class="getStyle(status)"
        :title="`${t(getTooltip(status))}`"
      ></component>
      <span class="text-secondaryDark">
        {{ env.key }}
      </span>
      <span class="text-secondaryDark pl-2 break-all">
        {{ ` \xA0 — \xA0 ${env.value}` }}
      </span>
      <span
        v-if="status === 'updations'"
        class="text-secondaryLight px-2 break-all"
      >
        {{ ` \xA0 ← \xA0 ${env.previousValue}` }}
      </span>
    </div>
    <span
      v-if="global"
      class="px-1 rounded bg-accentLight text-accentContrast text-tiny"
    >
      Global
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

import IconPlusCircle from "~icons/lucide/plus-circle"
import IconCheckCircle from "~icons/lucide/check-circle-2"
import IconMinusCircle from "~icons/lucide/minus-circle"

type Status = "updations" | "additions" | "deletions"
type Props = {
  env: {
    key: string
    value: string
    previousValue?: string
  }
  status: Status
  global: boolean
}

withDefaults(defineProps<Props>(), {
  global: false,
})

const t = useI18n()

const getIcon = (status: Status) => {
  switch (status) {
    case "additions":
      return IconPlusCircle
    case "updations":
      return IconCheckCircle
    case "deletions":
      return IconMinusCircle
  }
}

const getStyle = (status: Status) => {
  switch (status) {
    case "additions":
      return "text-green-500"
    case "updations":
      return "text-yellow-500"
    case "deletions":
      return "text-red-500"
  }
}

const getTooltip = (status: Status) => {
  switch (status) {
    case "additions":
      return "environment.added"
    case "updations":
      return "environment.updated"
    case "deletions":
      return "environment.deleted"
  }
}
</script>
