<template>
  <div
    v-if="currentWorkspaceName"
    class="flex items-center overflow-x-auto whitespace-nowrap border-b border-dividerLight px-4 py-2 text-tiny text-secondaryLight"
  >
    <span class="truncate">
      {{ currentWorkspaceName }}
    </span>
    <icon-lucide-chevron-right v-if="section" class="mx-2" />
    {{ section }}
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useService } from "dioc/vue"
import { NewWorkspaceService } from "~/services/new-workspace/workspace.service"

defineProps<{
  section?: string
}>()

const workspaceService = useService(NewWorkspaceService)
const currentWorkspaceName = computed(() => {
  if (!workspaceService.currentWorkspace.value) return null

  const res = workspaceService.getWorkspace(
    workspaceService.currentWorkspace.value.provider,
    workspaceService.currentWorkspace.value.handle
  )

  if (res.type !== "available") return null

  return res.data.name
})
</script>
