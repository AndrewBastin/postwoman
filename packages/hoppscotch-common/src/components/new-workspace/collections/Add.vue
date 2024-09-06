<template>
  <HoppSmartModal
    v-if="props.showFor"
    dialog
    :title="
      props.showFor.type === 'collection'
        ? t('collection.new')
        : t('folder.new')
    "
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="editingName"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="addNewCollection"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="addNewCollection"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts">
/**
 *
 */
export type AddFor =
  | { type: "collection" }
  | { type: "folder"; parentHandle: RESTCollectionHandle }
  | null
</script>

<script setup lang="ts">
import { watch, ref } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { RESTCollectionHandle } from "~/services/new-workspace/workspace.service"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  showFor: AddFor
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "submit", args: { name: string; showFor: NonNullable<AddFor> }): void
  (e: "hide-modal"): void
}>()

const editingName = ref("")

watch(
  () => props.showFor,
  (forValue) => {
    if (forValue === null) {
      editingName.value = ""
    }
  }
)

const addNewCollection = () => {
  if (!editingName.value) {
    toast.error(t("collection.invalid_name"))
    return
  }

  if (props.showFor === null) {
    return
  }

  emit("submit", {
    name: editingName.value,
    showFor: props.showFor,
  })
}

const hideModal = () => {
  editingName.value = ""
  emit("hide-modal")
}
</script>
