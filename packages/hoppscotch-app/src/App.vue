<template>
  <ErrorPage
    v-if="errorInfo !== null"
    :error="errorInfo"
  />
  <router-view v-else />
</template>

<script setup lang="ts">
import { ref } from "vue";
import ErrorPage, { ErrorPageData } from "~/pages/_.vue";
import { HOPP_MODULES } from '@modules/.';
import { useI18n } from "@composables/i18n";

const t = useI18n()

const errorInfo = ref<ErrorPageData | null>(null)

// App Crash Handler
// If the below code gets more complicated, move this onto a module
const formatErrorMessage = (err: Error | null | undefined) => {
  if (!err) return null
  return `${err.name}: ${err.message}`
}

window.onerror = (_, _1, _2, _3, err) => {
  errorInfo.value = {
    statusCode: 500,
    message: formatErrorMessage(err) ?? t("error.something_went_wrong")
  }
}

// Run module root component setup code
HOPP_MODULES.forEach((mod) => mod.onRootSetup?.())
</script>
